import { db } from '@/server/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { getAuditLogsForEntity } from '@/modules/audit/service';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

/**
 * GET /api/v1/complaints/[id]/audit
 *
 * Retrieves the operational audit history for a specific complaint.
 * Ensures the complaint exists before returning chronological audit entries.
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

    // Verify complaint exists
    const complaint = await db.complaint.findFirst({
      where: {
        OR: [{ id }, { complaintNumber: id }],
      },
      select: { id: true, complaintNumber: true },
    });

    if (!complaint) {
      return apiError(
        'COMPLAINT_NOT_FOUND',
        `Complaint with identifier '${id}' was not found.`,
        404
      );
    }

    const auditLogs = await getAuditLogsForEntity('COMPLAINT', complaint.id);

    return apiSuccess({
      complaintId: complaint.id,
      complaintNumber: complaint.complaintNumber,
      auditLogs,
    });
  } catch (_error: unknown) {
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while retrieving complaint audit logs.',
      500
    );
  }
}
