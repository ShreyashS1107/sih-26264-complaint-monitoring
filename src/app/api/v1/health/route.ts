import { db } from '@/server/db';
import { apiError, apiSuccess } from '@/lib/api-response';

/**
 * GET /api/v1/health
 *
 * Operational health and database readiness endpoint.
 * Suitable for monitoring probes, container readiness checks, and load balancers.
 * Does not require authentication.
 */
export async function GET() {
  try {
    // Verify database connectivity by executing a lightweight query
    await db.$queryRaw`SELECT 1`;

    return apiSuccess({
      status: 'healthy',
      database: 'connected',
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (_error: unknown) {
    return apiError(
      'SERVICE_UNAVAILABLE',
      'Database connectivity check failed.',
      503,
      {
        details: { database: 'disconnected' },
      }
    );
  }
}
