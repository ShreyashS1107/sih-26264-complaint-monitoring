import { db } from '@/server/db';
import { apiError, apiSuccess, logServerError } from '@/lib/api-response';

/**
 * GET /api/v1/health
 *
 * Operational health and database readiness endpoint.
 * Suitable for monitoring probes, container readiness checks, and load balancers.
 * Does not require authentication.
 */
export async function GET() {
  try {
    // 1. Verify database connectivity by executing a lightweight query
    await db.$queryRaw`SELECT 1`;

    // 2. Verify schema readiness (Prisma tables exist and have been migrated)
    let tablesMigrated = true;
    try {
      await db.bureau.count();
    } catch (tableErr) {
      logServerError('GET /api/v1/health:table_check', tableErr);
      tablesMigrated = false;
    }

    if (!tablesMigrated) {
      return apiError(
        'DATABASE_NOT_MIGRATED',
        'Database connection active, but required schema tables have not been migrated yet. Run prisma migrate deploy.',
        503,
        {
          details: { database: 'connected', tables: 'missing' },
        }
      );
    }

    return apiSuccess({
      status: 'healthy',
      database: 'connected',
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (error: unknown) {
    logServerError('GET /api/v1/health:connectivity_check', error);
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
