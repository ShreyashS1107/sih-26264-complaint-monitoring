import { db } from '@/server/db';
import { apiError, apiSuccess, handleDatabaseOrServerError } from '@/lib/api-response';
import { approvalStatusEnum } from '@/modules/institutions/schema';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

const institutionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  institutionType: z.string().optional(),
  approvalStatus: approvalStatusEnum.optional(),
  sortBy: z.enum(['name', 'permanentId', 'createdAt', 'state']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * GET /api/v1/institutions
 *
 * Lists AICTE institutions with pagination, search, state/district filters,
 * and associated complaint & overlap candidate counts.
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

    const validation = institutionListQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return apiError(
        'VALIDATION_ERROR',
        'Invalid institution query parameters.',
        400,
        { details: validation.error.flatten() }
      );
    }

    const query = validation.data;
    const where: Prisma.InstitutionWhereInput = {};

    if (query.state) where.state = { equals: query.state, mode: 'insensitive' };
    if (query.district) where.district = { equals: query.district, mode: 'insensitive' };
    if (query.institutionType) where.institutionType = query.institutionType;
    if (query.approvalStatus) where.approvalStatus = query.approvalStatus;

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { permanentId: { contains: term, mode: 'insensitive' } },
        { district: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [institutions, total] = await Promise.all([
      db.institution.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          _count: {
            select: {
              complaints: true,
              overlapCandidates: true,
            },
          },
        },
      }),
      db.institution.count({ where }),
    ]);

    const formattedInstitutions = institutions.map((inst) => ({
      id: inst.id,
      permanentId: inst.permanentId,
      name: inst.name,
      state: inst.state,
      district: inst.district,
      address: inst.address,
      pinCode: inst.pinCode,
      institutionType: inst.institutionType,
      approvalStatus: inst.approvalStatus,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
      complaintCount: inst._count.complaints,
      overlapCandidateCount: inst._count.overlapCandidates,
    }));

    return apiSuccess({
      institutions: formattedInstitutions,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (_error: unknown) {
    return handleDatabaseOrServerError(
      'GET /api/v1/institutions',
      _error,
      'An unexpected error occurred while querying institutions.'
    );
  }
}
