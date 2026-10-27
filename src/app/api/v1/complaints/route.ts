import { db } from '@/server/db';
import { apiError, apiSuccess, logServerError, handleDatabaseOrServerError } from '@/lib/api-response';
import { resolveAuthenticatedOfficer } from '@/lib/auth';
import { checkPrototypeMutationAccess, PROTOTYPE_ACTOR_ROLE } from '@/lib/prototype-access';
import { createAuditLog } from '@/modules/audit/service';
import {
  complaintCategoryEnum,
  complaintPriorityEnum,
  complaintStatusEnum,
  createComplaintSchema,
} from '@/modules/complaints/schema';
import { analyzeAndPersistOverlaps } from '@/modules/overlap-detection';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * Validation schema for complaint list query parameters.
 */
const complaintListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  bureauId: z.string().max(100).optional(),
  institutionId: z.string().max(100).optional(),
  status: complaintStatusEnum.optional(),
  priority: complaintPriorityEnum.optional(),
  category: complaintCategoryEnum.optional(),
  search: z.string().max(100).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'priority', 'status', 'complaintNumber'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

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
 * GET /api/v1/complaints
 *
 * Lists complaints with pagination, filtering, search, and sorting.
 * Returns associated institution, bureau, assigned officer, and overlap counts.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (value !== '') {
        rawQuery[key] = value;
      }
    }

    const validation = complaintListQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', 'Invalid query parameters provided.', 400, {
        details: validation.error.flatten(),
      });
    }

    const query = validation.data;
    const where: Prisma.ComplaintWhereInput = {};

    if (query.bureauId) where.bureauId = query.bureauId;
    if (query.institutionId) where.institutionId = query.institutionId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = query.category;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = query.startDate;
      if (query.endDate) where.createdAt.lte = query.endDate;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { complaintNumber: { contains: term, mode: 'insensitive' } },
        { subject: { contains: term, mode: 'insensitive' } },
        { originalBureauRef: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [complaints, total] = await Promise.all([
      db.complaint.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          institution: {
            select: {
              id: true,
              permanentId: true,
              name: true,
              state: true,
              district: true,
            },
          },
          bureau: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          assignedOfficer: {
            select: SAFE_OFFICER_SELECT,
          },
          _count: {
            select: {
              primaryOverlapCandidates: true,
              secondaryOverlapCandidates: true,
            },
          },
        },
      }),
      db.complaint.count({ where }),
    ]);

    const formattedComplaints = complaints.map((c) => ({
      id: c.id,
      complaintNumber: c.complaintNumber,
      originalBureauRef: c.originalBureauRef,
      institutionId: c.institutionId,
      bureauId: c.bureauId,
      assignedOfficerId: c.assignedOfficerId,
      subject: c.subject,
      description: c.description,
      category: c.category,
      priority: c.priority,
      status: c.status,
      incidentDate: c.incidentDate,
      complainantType: c.complainantType,
      complainantMaskedId: c.complainantMaskedId,
      resolvedAt: c.resolvedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      institution: c.institution,
      bureau: c.bureau,
      assignedOfficer: c.assignedOfficer,
      overlapCount: c._count.primaryOverlapCandidates + c._count.secondaryOverlapCandidates,
    }));

    return apiSuccess({
      complaints: formattedComplaints,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (_error: unknown) {
    return handleDatabaseOrServerError(
      'GET /api/v1/complaints',
      _error,
      'An unexpected error occurred while retrieving complaints.'
    );
  }
}

/**
 * POST /api/v1/complaints
 *
 * Ingests a new complaint into the AICTE Complaint Monitoring system.
 *
 * Requirements:
 * 1. Safe JSON parsing with structured 400 response on malformed input.
 * 2. Zod validation using createComplaintSchema with useful, non-sensitive errors.
 * 3. Strict security gate: resolves trusted server-side identity; fails closed (401)
 *    before permitting any database mutation.
 * 4. Enforces bureau-level access authorization based on the trusted officer's role.
 * 5. Verifies existence of referenced institution, bureau, and assigned officer relations.
 * 6. Atomic persistence of the complaint and operational INGEST_COMPLAINT audit log.
 * 7. Automated cross-bureau overlap analysis invocation without nesting transactions.
 * 8. Safe error handling: never auto-merges or deletes complaints, and never exposes
 *    database credentials or stack traces to callers.
 */
export async function POST(request: Request) {
  try {
    // 1. Parse JSON safely
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

    // 2. Validate payload against createComplaintSchema
    const validation = createComplaintSchema.safeParse(body);
    if (!validation.success) {
      console.error(
        '[API complaints POST validation error]',
        JSON.stringify(validation.error.flatten().fieldErrors)
      );
      return apiError('VALIDATION_ERROR', 'Invalid complaint data provided.', 400, {
        details: validation.error.flatten(),
      });
    }
    const input = validation.data;

    // 3. Resolve identity and verify prototype / authenticated access
    const officer = await resolveAuthenticatedOfficer(request);
    const access = checkPrototypeMutationAccess(request, officer);

    if (!access.allowed) {
      return apiError(
        access.error || 'UNAUTHORIZED',
        access.message || 'Authentication required.',
        access.status || 401
      );
    }

    // 4. Enforce bureau authorization when an authenticated officer is present
    const isBureauCode =
      input.bureauId.includes('_') ||
      [
        'APPROVAL_BUREAU',
        'ANTI_RAGGING_CELL',
        'STUDENT_GRIEVANCE_CELL',
        'FACULTY_GRIEVANCE_CELL',
        'VIGILANCE_BUREAU',
        'REGIONAL_OFFICE',
      ].includes(input.bureauId);

    if (officer && officer.role !== 'CENTRAL_ADMIN' && officer.bureauId !== input.bureauId) {
      let isAuthorizedBureau = false;
      if (isBureauCode) {
        try {
          const officerBureau = await db.bureau.findUnique({
            where: { id: officer.bureauId },
            select: { code: true },
          });
          if (officerBureau && officerBureau.code === input.bureauId) {
            isAuthorizedBureau = true;
          }
        } catch {
          // Leave isAuthorizedBureau as false on failure
        }
      }
      if (!isAuthorizedBureau) {
        return apiError(
          'FORBIDDEN',
          `Officers of role '${officer.role}' can only ingest complaints for their assigned bureau.`,
          403
        );
      }
    }

    // 5. Validate referenced relations (institution, bureau, optional assigned officer)
    const isPermanentId = Boolean(input.permanentId) || input.institutionId.startsWith('1-');

    const [institution, bureau] = await Promise.all([
      isPermanentId
        ? db.institution.findUnique({
            where: { permanentId: input.permanentId || input.institutionId },
            select: { id: true, name: true, permanentId: true },
          })
        : db.institution.findUnique({
            where: { id: input.institutionId },
            select: { id: true, name: true, permanentId: true },
          }),
      isBureauCode
        ? db.bureau.findUnique({
            where: { code: input.bureauId },
            select: { id: true, code: true },
          })
        : db.bureau.findUnique({
            where: { id: input.bureauId },
            select: { id: true, code: true },
          }),
    ]);

    if (!institution) {
      return apiError(
        'NOT_FOUND',
        `Institution with ID '${input.institutionId}' was not found.`,
        404
      );
    }

    if (!bureau) {
      return apiError('NOT_FOUND', `Bureau with ID '${input.bureauId}' was not found.`, 404);
    }

    if (input.assignedOfficerId) {
      const assigned = await db.officer.findUnique({
        where: { id: input.assignedOfficerId },
        select: { id: true },
      });
      if (!assigned) {
        return apiError(
          'NOT_FOUND',
          `Assigned officer with ID '${input.assignedOfficerId}' was not found.`,
          404
        );
      }
    }

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    // 6. Atomically persist complaint and operational audit log
    let createdComplaint;
    try {
      createdComplaint = await db.$transaction(async (tx) => {
        const complaint = await tx.complaint.create({
          data: {
            complaintNumber: input.complaintNumber,
            originalBureauRef: input.originalBureauRef,
            institutionId: institution.id,
            bureauId: bureau.id,
            assignedOfficerId: input.assignedOfficerId ?? null,
            subject: input.subject,
            description: input.description,
            category: input.category,
            priority: input.priority,
            status: input.status,
            incidentDate: input.incidentDate ?? null,
            complainantType: input.complainantType,
            complainantMaskedId: input.complainantMaskedId ?? null,
          },
          include: {
            institution: true,
            bureau: true,
            assignedOfficer: {
              select: SAFE_OFFICER_SELECT,
            },
          },
        });

        await createAuditLog(
          {
            entityType: 'COMPLAINT',
            entityId: complaint.id,
            action: 'INGEST_COMPLAINT',
            actorId: officer?.id ?? null,
            actorRole: officer?.role ?? PROTOTYPE_ACTOR_ROLE,
            bureauId: complaint.bureauId,
            ipAddress,
            details: {
              complaintNumber: complaint.complaintNumber,
              originalBureauRef: complaint.originalBureauRef,
              institutionId: complaint.institutionId,
              bureauId: complaint.bureauId,
              category: complaint.category,
              priority: complaint.priority,
              status: complaint.status,
              complainantType: complaint.complainantType,
              prototypeAccess: !officer,
              evidenceCount: input.evidence?.length ?? 0,
              evidence: input.evidence,
              allegations: input.allegations,
            },
          },
          tx
        );

        return complaint;
      });
    } catch (txError: unknown) {
      logServerError('POST /api/v1/complaints:transaction', txError);
      if (
        typeof txError === 'object' &&
        txError !== null &&
        'code' in txError &&
        (txError as { code: string }).code === 'P2002'
      ) {
        return apiError(
          'CONFLICT',
          `Complaint with number '${input.complaintNumber}' already exists.`,
          409
        );
      }

      return apiError(
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred while persisting the complaint.',
        500
      );
    }

    // 7. Invoke automated cross-bureau overlap analysis
    let overlapResult;
    try {
      overlapResult = await analyzeAndPersistOverlaps(createdComplaint.id);
    } catch (analysisError: unknown) {
      logServerError('POST /api/v1/complaints:overlap_analysis', analysisError);
      try {
        await createAuditLog({
          entityType: 'COMPLAINT',
          entityId: createdComplaint.id,
          action: 'OVERLAP_ANALYSIS_FAILED',
          actorId: officer?.id ?? null,
          actorRole: officer?.role ?? PROTOTYPE_ACTOR_ROLE,
          bureauId: createdComplaint.bureauId,
          ipAddress,
          details: {
            error:
              analysisError instanceof Error
                ? analysisError.message
                : 'Unknown overlap analysis error',
            prototypeAccess: !officer,
          },
        });
      } catch {
        // Suppress secondary audit error
      }

      return apiError(
        'OVERLAP_ANALYSIS_FAILED',
        'Complaint was recorded, but automated overlap analysis failed.',
        500,
        {
          details: {
            complaintId: createdComplaint.id,
            complaintNumber: createdComplaint.complaintNumber,
          },
        }
      );
    }

    // 8. Return 201 Created with complaint record and overlap detection summary
    return apiSuccess(
      {
        complaint: {
          ...createdComplaint,
          evidence: input.evidence || [],
          allegations: input.allegations || [],
        },
        overlaps: {
          evaluatedPoolSize: overlapResult.evaluatedPoolSize,
          detectedCandidateCount: overlapResult.detectedCandidateCount,
          candidates: overlapResult.candidates,
        },
      },
      { status: 201 }
    );
  } catch (_error: unknown) {
    return handleDatabaseOrServerError(
      'POST /api/v1/complaints',
      _error,
      'An unexpected error occurred while processing the request.'
    );
  }
}
