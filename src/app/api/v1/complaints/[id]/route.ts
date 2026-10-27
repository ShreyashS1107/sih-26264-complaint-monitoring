import { db } from '@/server/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { resolveAuthenticatedOfficer } from '@/lib/auth';
import { checkPrototypeMutationAccess, PROTOTYPE_ACTOR_ROLE } from '@/lib/prototype-access';
import { createAuditLog } from '@/modules/audit/service';
import {
  complaintCategoryEnum,
  complaintPriorityEnum,
  complaintStatusEnum,
} from '@/modules/complaints/schema';
import { getOverlapCandidatesForComplaint } from '@/modules/overlap-detection';
import type { ActionType, Prisma } from '@prisma/client';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

/**
 * Permitted status state machine transitions.
 */
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['UNDER_PRELIMINARY_REVIEW', 'DISMISSED'],
  UNDER_PRELIMINARY_REVIEW: ['UNDER_INQUIRY', 'COORDINATED_REVIEW', 'DISMISSED'],
  UNDER_INQUIRY: ['COORDINATED_REVIEW', 'RESOLVED', 'DISMISSED'],
  COORDINATED_REVIEW: ['UNDER_INQUIRY', 'RESOLVED', 'DISMISSED'],
  RESOLVED: ['CLOSED', 'UNDER_INQUIRY'],
  CLOSED: ['UNDER_PRELIMINARY_REVIEW', 'UNDER_INQUIRY'],
  DISMISSED: ['UNDER_PRELIMINARY_REVIEW'],
};

/**
 * Safe projection for officer identity data.
 */
const SAFE_OFFICER_SELECT = {
  id: true,
  badgeNumber: true,
  name: true,
  email: true,
  role: true,
  bureauId: true,
} as const;

/**
 * Validation schema for complaint update payloads.
 */
const updateComplaintSchema = z.object({
  status: complaintStatusEnum.optional(),
  priority: complaintPriorityEnum.optional(),
  category: complaintCategoryEnum.optional(),
  assignedOfficerId: z.string().nullable().optional(),
  notes: z
    .string()
    .min(5, 'Audit note describing the update is required (minimum 5 characters)')
    .max(2000, 'Audit note cannot exceed 2000 characters'),
});

/**
 * GET /api/v1/complaints/[id]
 *
 * Retrieves a single complaint by its ID or complaint number, including
 * institution, bureau, assigned officer, case actions timeline, and overlap candidates.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const rawParams = await context.params;
    const id = rawParams?.id?.trim();

    if (!id || id === '' || id === 'undefined' || id === 'null') {
      return apiError(
        'INVALID_COMPLAINT_ID',
        'Complaint ID parameter must be a non-empty string.',
        400
      );
    }

    // Support lookup by primary key ID or by unique complaintNumber
    const complaint = await db.complaint.findFirst({
      where: {
        OR: [{ id }, { complaintNumber: id }],
      },
      include: {
        institution: true,
        bureau: true,
        assignedOfficer: {
          select: SAFE_OFFICER_SELECT,
        },
        caseActions: {
          include: {
            officer: {
              select: {
                id: true,
                badgeNumber: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!complaint) {
      return apiError(
        'COMPLAINT_NOT_FOUND',
        `Complaint with identifier '${id}' was not found.`,
        404
      );
    }

    // Retrieve active overlap candidates for this complaint
    const overlapCandidates = await getOverlapCandidatesForComplaint(complaint.id);

    return apiSuccess({
      ...complaint,
      overlaps: {
        count: overlapCandidates.length,
        candidates: overlapCandidates,
      },
    });
  } catch (_error: unknown) {
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while retrieving the complaint.',
      500
    );
  }
}

/**
 * PATCH /api/v1/complaints/[id]
 *
 * Updates a complaint's status, priority, category, or officer assignment.
 * Requires authenticated officer; enforces bureau-level authorization;
 * records timeline CaseAction and AuditLog.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const rawParams = await context.params;
    const id = rawParams?.id?.trim();

    if (!id || id === '' || id === 'undefined' || id === 'null') {
      return apiError(
        'INVALID_COMPLAINT_ID',
        'Complaint ID parameter must be a non-empty string.',
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

    // 2. Parse and validate request JSON
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

    const validation = updateComplaintSchema.safeParse(body);
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', 'Invalid update data provided.', 400, {
        details: validation.error.flatten(),
      });
    }

    const input = validation.data;

    // Ensure at least one field is being modified
    if (
      input.status === undefined &&
      input.priority === undefined &&
      input.category === undefined &&
      input.assignedOfficerId === undefined
    ) {
      return apiError(
        'NO_CHANGES_REQUESTED',
        'At least one field (status, priority, category, or assignedOfficerId) must be provided for update.',
        400
      );
    }

    // 3. Verify existing complaint
    const existing = await db.complaint.findUnique({
      where: { id },
      include: {
        bureau: true,
      },
    });

    if (!existing) {
      return apiError('COMPLAINT_NOT_FOUND', `Complaint with ID '${id}' was not found.`, 404);
    }

    // 4. Enforce bureau authorization when an authenticated officer is present
    if (
      officer &&
      officer.role !== 'CENTRAL_ADMIN' &&
      officer.bureauId !== existing.bureauId &&
      existing.assignedOfficerId !== officer.id
    ) {
      return apiError(
        'FORBIDDEN',
        'You are not authorized to modify complaints belonging to another bureau.',
        403
      );
    }

    // 5. Validate permitted status transition
    if (input.status && input.status !== existing.status) {
      const allowedNext = ALLOWED_STATUS_TRANSITIONS[existing.status] ?? [];
      if (!allowedNext.includes(input.status)) {
        return apiError(
          'INVALID_STATUS_TRANSITION',
          `Transition from '${existing.status}' to '${input.status}' is not permitted. Permitted transitions: ${allowedNext.join(', ') || 'None'}.`,
          400
        );
      }
    }

    // 6. Verify assigned officer if provided
    if (input.assignedOfficerId) {
      const assigned = await db.officer.findUnique({
        where: { id: input.assignedOfficerId },
        select: { id: true, name: true },
      });
      if (!assigned) {
        return apiError(
          'OFFICER_NOT_FOUND',
          `Assigned officer with ID '${input.assignedOfficerId}' was not found.`,
          404
        );
      }
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    // 7. Atomically update complaint, create CaseAction, and log audit record
    const updatedComplaint = await db.$transaction(async (tx) => {
      const updateData: Prisma.ComplaintUpdateInput = {};
      if (input.status) {
        updateData.status = input.status;
        if (input.status === 'RESOLVED' && !existing.resolvedAt) {
          updateData.resolvedAt = new Date();
        }
      }
      if (input.priority) updateData.priority = input.priority;
      if (input.category) updateData.category = input.category;
      if (input.assignedOfficerId !== undefined) {
        updateData.assignedOfficer = input.assignedOfficerId
          ? { connect: { id: input.assignedOfficerId } }
          : { disconnect: true };
      }

      const updated = await tx.complaint.update({
        where: { id },
        data: updateData,
        include: {
          institution: true,
          bureau: true,
          assignedOfficer: {
            select: SAFE_OFFICER_SELECT,
          },
        },
      });

      // Determine timeline action type
      let actionType: ActionType = 'NOTE_ADDED';
      if (input.status && input.status !== existing.status) {
        actionType = 'STATUS_CHANGE';
      } else if (
        input.assignedOfficerId !== undefined &&
        input.assignedOfficerId !== existing.assignedOfficerId
      ) {
        actionType = 'OFFICER_ASSIGNED';
      }

      await tx.caseAction.create({
        data: {
          complaintId: id,
          officerId: officer?.id ?? null,
          actionType,
          previousStatus: existing.status,
          newStatus: input.status ?? existing.status,
          notes: input.notes,
          metadata: {
            prototypeAccess: !officer,
          },
        },
      });

      await createAuditLog(
        {
          entityType: 'COMPLAINT',
          entityId: id,
          action: 'UPDATE_COMPLAINT',
          actorId: officer?.id ?? null,
          actorRole: officer?.role ?? PROTOTYPE_ACTOR_ROLE,
          bureauId: existing.bureauId,
          ipAddress,
          details: {
            previousStatus: existing.status,
            newStatus: input.status ?? existing.status,
            previousPriority: existing.priority,
            newPriority: input.priority ?? existing.priority,
            previousCategory: existing.category,
            newCategory: input.category ?? existing.category,
            assignedOfficerId: input.assignedOfficerId,
            notes: input.notes,
            prototypeAccess: !officer,
          },
        },
        tx
      );

      return updated;
    });

    return apiSuccess({ complaint: updatedComplaint });
  } catch (_error: unknown) {
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while updating the complaint.',
      500
    );
  }
}
