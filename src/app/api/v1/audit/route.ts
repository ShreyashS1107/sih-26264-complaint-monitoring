import { db } from '@/server/db';
import { apiError, apiSuccess, logServerError } from '@/lib/api-response';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  entityType: z.string().max(100).optional(),
  entityId: z.string().max(100).optional(),
  bureauId: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
  actorId: z.string().max(100).optional(),
});

/**
 * GET /api/v1/audit
 *
 * Queries operational audit logs with pagination and multi-parameter filtering.
 * Never leaks internal database connection details, unredacted secrets, or client IP addresses.
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

    const validation = auditQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return apiError(
        'VALIDATION_ERROR',
        'Invalid audit query parameters.',
        400,
        { details: validation.error.flatten() }
      );
    }

    const query = validation.data;
    const where: Prisma.AuditLogWhereInput = {};

    if (query.entityType) where.entityType = query.entityType.trim();
    if (query.entityId) where.entityId = query.entityId.trim();
    if (query.bureauId) where.bureauId = query.bureauId.trim();
    if (query.action) where.action = query.action.trim();
    if (query.actorId) where.actorId = query.actorId.trim();

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          action: true,
          actorId: true,
          actorRole: true,
          bureauId: true,
          details: true,
          timestamp: true,
          actor: {
            select: {
              id: true,
              badgeNumber: true,
              name: true,
              role: true,
            },
          },
        },
      }),
      db.auditLog.count({ where }),
    ]);

    return apiSuccess({
      auditLogs: logs,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (_error: unknown) {
    logServerError('GET /api/v1/audit', _error);
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while querying audit logs.',
      500
    );
  }
}
