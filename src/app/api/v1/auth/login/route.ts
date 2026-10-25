import { db } from '@/server/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { AUTH_COOKIE_NAME, DEFAULT_SESSION_EXPIRY_SECONDS, signOfficerToken } from '@/lib/auth';
import { createAuditLog } from '@/modules/audit/service';
import { z } from 'zod';

const loginSchema = z.object({
  badgeNumber: z.string().trim().min(1, 'Badge number is required'),
  email: z.string().trim().email('Valid institutional email is required').optional(),
});

/**
 * POST /api/v1/auth/login
 *
 * Authenticates an AICTE officer via official badge number and institutional email.
 * Issues a cryptographically signed HMAC-SHA256 session token set as an HttpOnly cookie
 * and returned in the JSON response body.
 */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('INVALID_JSON', 'Request payload must be valid JSON.', 400);
    }

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', 'Invalid credentials provided.', 400, {
        details: validation.error.flatten(),
      });
    }

    const { badgeNumber, email } = validation.data;

    // Find active officer in PostgreSQL
    const officer = await db.officer.findFirst({
      where: {
        badgeNumber,
        ...(email ? { email: { equals: email, mode: 'insensitive' } } : {}),
        isActive: true,
      },
      include: {
        bureau: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!officer) {
      return apiError(
        'INVALID_CREDENTIALS',
        'Officer identity not found or inactive. Verify badge number and credentials.',
        401
      );
    }

    // Sign cryptographic session token
    const token = signOfficerToken({
      id: officer.id,
      badgeNumber: officer.badgeNumber,
      name: officer.name,
      email: officer.email,
      bureauId: officer.bureauId,
      role: officer.role,
    });

    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    // Record operational audit trail for authentication
    try {
      await createAuditLog({
        entityType: 'OFFICER',
        entityId: officer.id,
        action: 'OFFICER_LOGIN',
        actorId: officer.id,
        actorRole: officer.role,
        bureauId: officer.bureauId,
        ipAddress,
        details: {
          badgeNumber: officer.badgeNumber,
          role: officer.role,
          bureauCode: officer.bureau.code,
        },
      });
    } catch {
      // Non-blocking for login audit
    }

    const isProd = process.env.NODE_ENV === 'production';
    const cookieHeader = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DEFAULT_SESSION_EXPIRY_SECONDS}${isProd ? '; Secure' : ''}`;

    const response = apiSuccess(
      {
        token,
        officer: {
          id: officer.id,
          badgeNumber: officer.badgeNumber,
          name: officer.name,
          email: officer.email,
          role: officer.role,
          bureau: officer.bureau,
        },
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': cookieHeader,
        },
      }
    );

    return response;
  } catch (_error: unknown) {
    return apiError(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred during authentication.',
      500
    );
  }
}
