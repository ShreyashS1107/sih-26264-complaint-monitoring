import { db } from '@/server/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { resolveAuthenticatedOfficer } from '@/lib/auth';

/**
 * GET /api/v1/auth/me
 *
 * Resolves and returns the currently authenticated officer's identity and assigned bureau.
 * Returns 401 if unauthenticated or session has expired.
 */
export async function GET(request: Request) {
  try {
    const officer = await resolveAuthenticatedOfficer(request);

    if (!officer) {
      return apiError(
        'UNAUTHORIZED',
        'Authentication required. No valid officer session found.',
        401
      );
    }

    const fullOfficer = await db.officer.findUnique({
      where: { id: officer.id },
      select: {
        id: true,
        badgeNumber: true,
        name: true,
        email: true,
        role: true,
        bureau: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!fullOfficer) {
      return apiError('UNAUTHORIZED', 'Officer record no longer exists.', 401);
    }

    return apiSuccess({ officer: fullOfficer });
  } catch (_error: unknown) {
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while resolving identity.',
      500
    );
  }
}
