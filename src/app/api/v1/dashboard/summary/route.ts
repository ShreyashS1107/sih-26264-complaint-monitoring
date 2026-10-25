import { db } from '@/server/db';
import { apiError, apiSuccess } from '@/lib/api-response';

/**
 * GET /api/v1/dashboard/summary
 *
 * Provides aggregated caseload metrics, bureau distributions, priority breakdowns,
 * and cross-bureau overlap summary statistics for the executive dashboard.
 */
export async function GET() {
  try {
    const [
      totalComplaints,
      complaintsByStatusRaw,
      complaintsByPriorityRaw,
      complaintsByCategoryRaw,
      bureaus,
      totalOverlapCandidates,
      overlapByStatusRaw,
      topInstitutions,
    ] = await Promise.all([
      db.complaint.count(),
      db.complaint.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      db.complaint.groupBy({
        by: ['priority'],
        _count: { id: true },
      }),
      db.complaint.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      db.bureau.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          _count: {
            select: { complaints: true },
          },
        },
        orderBy: { code: 'asc' },
      }),
      db.overlapCandidate.count(),
      db.overlapCandidate.groupBy({
        by: ['reviewStatus'],
        _count: { id: true },
      }),
      db.institution.findMany({
        take: 5,
        orderBy: {
          complaints: { _count: 'desc' },
        },
        select: {
          id: true,
          permanentId: true,
          name: true,
          state: true,
          district: true,
          _count: {
            select: { complaints: true, overlapCandidates: true },
          },
        },
      }),
    ]);

    // Format groupBy results into key-value records for clean dashboard consumption
    const complaintsByStatus: Record<string, number> = {};
    for (const item of complaintsByStatusRaw) {
      complaintsByStatus[item.status] = item._count.id;
    }

    const complaintsByPriority: Record<string, number> = {};
    for (const item of complaintsByPriorityRaw) {
      complaintsByPriority[item.priority] = item._count.id;
    }

    const complaintsByCategory: Record<string, number> = {};
    for (const item of complaintsByCategoryRaw) {
      complaintsByCategory[item.category] = item._count.id;
    }

    const overlapByStatus: Record<string, number> = {
      PENDING_REVIEW: 0,
      FLAGGED_JOINT_REVIEW: 0,
      CONFIRMED_OVERLAP: 0,
      DISMISSED_INDEPENDENT: 0,
    };
    for (const item of overlapByStatusRaw) {
      overlapByStatus[item.reviewStatus] = item._count.id;
    }

    const complaintsByBureau = bureaus.map((b) => ({
      bureauId: b.id,
      bureauCode: b.code,
      bureauName: b.name,
      complaintCount: b._count.complaints,
    }));

    const formattedTopInstitutions = topInstitutions.map((inst) => ({
      id: inst.id,
      permanentId: inst.permanentId,
      name: inst.name,
      state: inst.state,
      district: inst.district,
      complaintCount: inst._count.complaints,
      overlapCandidateCount: inst._count.overlapCandidates,
    }));

    return apiSuccess({
      overview: {
        totalComplaints,
        totalOverlapCandidates,
        pendingReviewCount: overlapByStatus.PENDING_REVIEW,
        confirmedOverlapCount: overlapByStatus.CONFIRMED_OVERLAP,
        flaggedJointReviewCount: overlapByStatus.FLAGGED_JOINT_REVIEW,
      },
      complaintsByStatus,
      complaintsByPriority,
      complaintsByCategory,
      complaintsByBureau,
      overlapMetrics: {
        totalCandidates: totalOverlapCandidates,
        statusBreakdown: overlapByStatus,
      },
      topInstitutions: formattedTopInstitutions,
    });
  } catch (_error: unknown) {
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while generating dashboard metrics.',
      500
    );
  }
}
