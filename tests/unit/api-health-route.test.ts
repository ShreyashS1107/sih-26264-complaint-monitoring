import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/v1/health/route';
import { db } from '@/server/db';

describe('GET /api/v1/health Route Handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 200 with healthy status when database is reachable', async () => {
    vi.spyOn(db, '$queryRaw').mockResolvedValue([{ '?column?': 1 }] as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
    expect(body.data.database).toBe('connected');
    expect(typeof body.data.uptimeSeconds).toBe('number');
    expect(body.meta.requestId).toBeDefined();
    expect(body.meta.timestamp).toBeDefined();
  });

  it('should return 503 SERVICE_UNAVAILABLE when database connectivity check fails', async () => {
    vi.spyOn(db, '$queryRaw').mockRejectedValue(new Error('Connection refused'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.message).toContain('Database connectivity check failed');
    expect(body.error.details.database).toBe('disconnected');
    expect(body.meta.requestId).toBeDefined();
  });
});
