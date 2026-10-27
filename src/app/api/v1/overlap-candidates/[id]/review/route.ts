import { db } from '@/server/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { resolveAuthenticatedOfficer } from '@/lib/auth';
import { checkPrototypeMutationAccess, PROTOTYPE_ACTOR_ROLE } from '@/lib/prototype-access';
import { createAuditLog } from '@/modules/audit/service';
import type { ActionType } from '@prisma/client';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const reviewDecisionSchema = z.object({
  decision: z.enum(['FLAGGED_JOINT_REVIEW', 'CONFIRMED_OVERLAP', 'DISMISSED_INDEPENDENT']),
  notes: z
    .string()
    .min(5, 'Review notes explaining the decision are required (minimum 5 characters)')
    .max(2000, 'Review notes cannot exceed 2000 characters'),
});

/**
 * POST /api/v1/overlap-candidates/[id]/review
 *
 * Records a human officer's review decision for a detected overlap candidate.
 *
 * Requirements:
 * 1. Resolves trusted authenticated officer before permitting review submission.
 * 2. Enforces bureau authorization: only officers belonging to one of the involved bureaus
 *    or a CENTRAL_ADMIN may record review decisions.
 * 3. Updates candidate reviewStatus, reviewer, reviewNotes, and reviewedAt timestamp.
 * 4. Records timeline CaseAction entries on both involved complaints (OVERLAP_LINKED or OVERLAP_DISMISSED).
 * 5. Records operational AuditLog attribution.
 * 6. CRITICAL INVARIANT: NEVER automatically merges or deletes complaints. Both complaints
 *    remain independent master records with their own bureau identifiers.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const rawParams = await context.params;
    const id = rawParams?.id?.trim();

    if (!id || id === '' || id === 'undefined' || id === 'null') {
      return apiError(
        'INVALID_CANDIDATE_ID',
        'Overlap candidate ID parameter must be a non-empty string.',
        400
      );
    }

    // 1. Resolve identity and verify prototype / authenticated access
    const officer = await resolveAuthenticatedOfficer(request);
    const access = checkPrototypeMutationAccess(request, officer);

    if (!access.allowed) {
      return apiError(
        access.error || 'UNAUTHORIZED',
        access.message || 'Authentication required.',
        access.status || 401
      );
    }

    // 2. Parse and validate JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(
        'INVALID_JSON',
        'Malformed or invalid JSON body. Request payload must be valid JSON.',
        400
      );
    }

    const validation = reviewDecisionSchema.safeParse(body);
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', 'Invalid review decision payload.', 400, {
        details: validation.error.flatten(),
      });
    }

    const input = validation.data;

    // 3. Verify candidate exists
    const existing = await db.overlapCandidate.findUnique({
      where: { id },
      include: {
        primaryComplaint: { select: { id: true, complaintNumber: true, bureauId: true } },
        candidateComplaint: { select: { id: true, complaintNumber: true, bureauId: true } },
      },
    });

    if (!existing) {
      return apiError(
        'OVERLAP_CANDIDATE_NOT_FOUND',
        `Overlap candidate with ID '${id}' was not found.`,
        404
      );
    }

    // 4. Enforce bureau authorization when an authenticated officer is present
    const isBureauOfficer =
      officer &&
      (officer.bureauId === existing.primaryComplaint.bureauId ||
        officer.bureauId === existing.candidateComplaint.bureauId);

    if (officer && officer.role !== 'CENTRAL_ADMIN' && !isBureauOfficer) {
      return apiError(
        'FORBIDDEN',
        'You are not authorized to review overlap candidates that do not involve your assigned bureau.',
        403
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    // 5. Atomically persist review decision, case actions, and audit log
    const updatedCandidate = await db.$transaction(async (tx) => {
      const updated = await tx.overlapCandidate.update({
        where: { id },
        data: {
          reviewStatus: input.decision,
          reviewNotes: input.notes,
          reviewedById: officer?.id ?? null,
          reviewedAt: new Date(),
        },
        include: {
          primaryComplaint: {
            select: {
              id: true,
              complaintNumber: true,
              bureau: { select: { id: true, code: true, name: true } },
            },
          },
          candidateComplaint: {
            select: {
              id: true,
              complaintNumber: true,
              bureau: { select: { id: true, code: true, name: true } },
            },
          },
          reviewedBy: {
            select: {
              id: true,
              badgeNumber: true,
              name: true,
              role: true,
            },
          },
        },
      });

      // Record CaseAction timeline entries on BOTH complaints
      const actionType: ActionType =
        input.decision === 'DISMISSED_INDEPENDENT' ? 'OVERLAP_DISMISSED' : 'OVERLAP_LINKED';

      await tx.caseAction.createMany({
        data: [
          {
            complaintId: existing.primaryComplaintId,
            officerId: officer?.id ?? null,
            actionType,
            notes: `Cross-bureau overlap review with ${existing.candidateComplaint.complaintNumber} marked as ${input.decision}. Officer note: ${input.notes}`,
            metadata: {
              candidateId: id,
              decision: input.decision,
              counterpartComplaintNumber: existing.candidateComplaint.complaintNumber,
              prototypeAccess: !officer,
            },
          },
          {
            complaintId: existing.candidateComplaintId,
            officerId: officer?.id ?? null,
            actionType,
            notes: `Cross-bureau overlap review with ${existing.primaryComplaint.complaintNumber} marked as ${input.decision}. Officer note: ${input.notes}`,
            metadata: {
              candidateId: id,
              decision: input.decision,
              counterpartComplaintNumber: existing.primaryComplaint.complaintNumber,
              prototypeAccess: !officer,
            },
          },
        ],
      });

      // Record operational AuditLog
      await createAuditLog(
        {
          entityType: 'OVERLAP_CANDIDATE',
          entityId: id,
          action: 'RECORD_OVERLAP_REVIEW',
          actorId: officer?.id ?? null,
          actorRole: officer?.role ?? PROTOTYPE_ACTOR_ROLE,
          bureauId: officer?.bureauId ?? existing.primaryComplaint.bureauId,
          ipAddress,
          details: {
            decision: input.decision,
            notes: input.notes,
            primaryComplaintId: existing.primaryComplaintId,
            candidateComplaintId: existing.candidateComplaintId,
            primaryComplaintNumber: existing.primaryComplaint.complaintNumber,
            candidateComplaintNumber: existing.candidateComplaint.complaintNumber,
            overallScore: existing.overallScore,
            prototypeAccess: !officer,
          },
        },
        tx
      );

      return updated;
    });

    return apiSuccess({ candidate: updatedCandidate });
  } catch (_error: unknown) {
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while recording the overlap review decision.',
      500
    );
  }
}
