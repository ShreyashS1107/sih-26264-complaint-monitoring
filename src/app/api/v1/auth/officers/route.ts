import { db } from '@/server/db';
import { apiError, apiSuccess } from '@/lib/api-response';

/**
 * GET /api/v1/auth/officers
 *
 * Lists available institutional officers with their bureau assignments and roles.
 * Used for role-switching demonstrations and test identity verification.
 * Does not expose passwords, hashes, or secrets.
 */
export async function GET() {
  try {
    const officers = await db.officer.findMany({
      where: { isActive: true },
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
      orderBy: { badgeNumber: 'asc' },
    });

    return apiSuccess({ officers });
  } catch (_error: unknown) {
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred while listing officers.',
      500
    );
  }
}
