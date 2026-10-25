import { apiSuccess } from '@/lib/api-response';
import { AUTH_COOKIE_NAME, resolveAuthenticatedOfficer } from '@/lib/auth';
import { createAuditLog } from '@/modules/audit/service';

/**
 * POST /api/v1/auth/logout
 *
 * Clears the officer session cookie and records an audit log event.
 */
export async function POST(request: Request) {
  try {
    const officer = await resolveAuthenticatedOfficer(request);

    if (officer) {
      try {
        await createAuditLog({
          entityType: 'OFFICER',
          entityId: officer.id,
          action: 'OFFICER_LOGOUT',
          actorId: officer.id,
          actorRole: officer.role,
          bureauId: officer.bureauId,
          details: { badgeNumber: officer.badgeNumber },
        });
      } catch {
        // Non-blocking
      }
    }

    const clearCookieHeader = `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

    return apiSuccess(
      { message: 'Session terminated successfully.' },
      {
        headers: {
          'Set-Cookie': clearCookieHeader,
        },
      }
    );
  } catch {
    const clearCookieHeader = `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
    return apiSuccess(
      { message: 'Session terminated.' },
      {
        headers: {
          'Set-Cookie': clearCookieHeader,
        },
      }
    );
  }
}
