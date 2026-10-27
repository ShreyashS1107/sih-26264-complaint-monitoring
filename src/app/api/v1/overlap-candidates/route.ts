import { db } from '@/server/db';
import { apiError, apiSuccess, logServerError } from '@/lib/api-response';
import { overlapReviewStatusSchema } from '@/modules/overlap-detection/schema';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

const candidateQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: overlapReviewStatusSchema.optional(),
  minScore: z.coerce.number().min(0).max(1).optional(),
  institutionId: z.string().optional(),
  bureauId: z.string().optional(),
  sortBy: z.enum(['overallScore', 'createdAt', 'updatedAt']).default('overallScore'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * GET /api/v1/overlap-candidates
 *
 * Lists detected cross-bureau overlap candidates with filtering, scoring,
 * pagination, and full complaint context.
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

    const validation = candidateQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return apiError(
        'VALIDATION_ERROR',
        'Invalid overlap candidate query parameters.',
        400,
        { details: validation.error.flatten() }
      );
    }

    const query = validation.data;
    const where: Prisma.OverlapCandidateWhereInput = {};

    if (query.status) where.reviewStatus = query.status;
    if (query.minScore !== undefined) where.overallScore = { gte: query.minScore };
    if (query.institutionId) where.institutionId = query.institutionId;

    if (query.bureauId) {
      where.OR = [
        { primaryComplaint: { bureauId: query.bureauId } },
        { candidateComplaint: { bureauId: query.bureauId } },
      ];
    }

    const [candidates, total] = await Promise.all([
      db.overlapCandidate.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ [query.sortBy]: query.sortOrder }, { id: 'asc' }],
        include: {
          primaryComplaint: {
            select: {
              id: true,
              complaintNumber: true,
              subject: true,
              category: true,
              priority: true,
              status: true,
              bureau: { select: { id: true, code: true, name: true } },
            },
          },
          candidateComplaint: {
            select: {
              id: true,
              complaintNumber: true,
              subject: true,
              category: true,
              priority: true,
              status: true,
              bureau: { select: { id: true, code: true, name: true } },
            },
          },
          institution: {
            select: {
              id: true,
              permanentId: true,
              name: true,
              state: true,
              district: true,
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
      }),
      db.overlapCandidate.count({ where }),
    ]);

    return apiSuccess({
      candidates,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (_error: unknown) {
    logServerError('GET /api/v1/overlap-candidates', _error);
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while querying overlap candidates.',
      500
    );
  }
}
