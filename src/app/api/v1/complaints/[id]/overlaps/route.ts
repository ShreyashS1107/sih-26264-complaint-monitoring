import { db } from '@/server/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getOverlapCandidatesForComplaint } from '@/modules/overlap-detection';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

/**
 * GET /api/v1/complaints/[id]/overlaps
 *
 * Retrieves detected overlap candidates for a given complaint ID, ordered by
 * overallScore descending with deterministic tie-breaking.
 */
export async function GET(
  _request: Request,
  context: RouteContext
) {
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

    // Confirm that the complaint exists in the database
    const complaint = await db.complaint.findUnique({
      where: { id },
      select: { id: true, complaintNumber: true },
    });

    if (!complaint) {
      return apiError(
        'COMPLAINT_NOT_FOUND',
        `Complaint with ID '${id}' was not found.`,
        404
      );
    }

    // Retrieve candidates using existing public overlap service
    const candidates = await getOverlapCandidatesForComplaint(id);

    // Apply stable tie-breaker for identical scores
    const sortedCandidates = [...candidates].sort((a, b) => {
      if (b.overallScore !== a.overallScore) {
        return b.overallScore - a.overallScore;
      }
      return a.id.localeCompare(b.id);
    });

    return apiSuccess(sortedCandidates);
  } catch (_error: unknown) {
    // Return safe 500 error envelope without exposing internal connection strings or stack traces
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while retrieving overlap candidates.',
      500
    );
  }
}
