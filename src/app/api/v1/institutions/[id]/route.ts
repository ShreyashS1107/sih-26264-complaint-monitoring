import { db } from '@/server/db';
import { apiError, apiSuccess } from '@/lib/api-response';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

/**
 * GET /api/v1/institutions/[id]
 *
 * Retrieves an institution by its primary ID or AICTE Permanent ID,
 * including aggregate counts and recent complaints across all bureaus.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const rawParams = await context.params;
    const id = rawParams?.id?.trim();

    if (!id || id === '' || id === 'undefined' || id === 'null') {
      return apiError(
        'INVALID_INSTITUTION_ID',
        'Institution ID parameter must be a non-empty string.',
        400
      );
    }

    const institution = await db.institution.findFirst({
      where: {
        OR: [{ id }, { permanentId: id }],
      },
      include: {
        _count: {
          select: {
            complaints: true,
            overlapCandidates: true,
          },
        },
        complaints: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            complaintNumber: true,
            originalBureauRef: true,
            subject: true,
            category: true,
            priority: true,
            status: true,
            createdAt: true,
            bureau: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!institution) {
      return apiError(
        'INSTITUTION_NOT_FOUND',
        `Institution with identifier '${id}' was not found.`,
        404
      );
    }

    return apiSuccess({
      id: institution.id,
      permanentId: institution.permanentId,
      name: institution.name,
      state: institution.state,
      district: institution.district,
      address: institution.address,
      pinCode: institution.pinCode,
      institutionType: institution.institutionType,
      approvalStatus: institution.approvalStatus,
      createdAt: institution.createdAt,
      updatedAt: institution.updatedAt,
      complaintCount: institution._count.complaints,
      overlapCandidateCount: institution._count.overlapCandidates,
      recentComplaints: institution.complaints,
    });
  } catch (_error: unknown) {
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while retrieving institution details.',
      500
    );
  }
}
