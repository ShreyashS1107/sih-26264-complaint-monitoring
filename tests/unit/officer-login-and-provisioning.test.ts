import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as loginPost } from '@/app/api/v1/auth/login/route';
import { db } from '@/server/db';

describe('Officer Login Route & Validation (/api/v1/auth/login)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db.auditLog, 'create').mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects missing badgeNumber with 400 VALIDATION_ERROR', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@demo.aicte.internal' }),
    });

    const res = await loginPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid email format with 400 VALIDATION_ERROR', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeNumber: 'OFF-AICTE-000', email: 'not-an-email' }),
    });

    const res = await loginPost(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 INVALID_CREDENTIALS when officer record is missing or inactive', async () => {
    vi.spyOn(db.officer, 'findFirst').mockResolvedValue(null);

    const req = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeNumber: 'OFF-AICTE-000' }),
    });

    const res = await loginPost(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
    expect(body.error.message).toContain('Officer identity not found or inactive');
  });

  it('returns 500 INTERNAL_SERVER_ERROR without exposing internal database errors if db throws', async () => {
    vi.spyOn(db.officer, 'findFirst').mockRejectedValue(
      new Error('relation "Officer" does not exist')
    );

    const req = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeNumber: 'OFF-AICTE-000' }),
    });

    const res = await loginPost(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred during authentication.');
    // Must never leak table names or SQL details in error message
    expect(JSON.stringify(body)).not.toContain('relation');
  });

  it('authenticates officer successfully when badge matches and email is omitted', async () => {
    const mockOfficer = {
      id: 'mock-officer-000',
      badgeNumber: 'OFF-AICTE-000',
      name: 'Dr. S. K. Rao (Central Admin)',
      email: 'dr.sk.rao@demo.aicte.internal',
      role: 'CENTRAL_ADMIN' as const,
      bureauId: 'bureau-001',
      isActive: true,
      bureau: {
        id: 'bureau-001',
        code: 'APPROVAL_BUREAU',
        name: 'Approval Bureau',
      },
    };

    vi.spyOn(db.officer, 'findFirst').mockResolvedValue(mockOfficer as any);

    const req = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeNumber: 'OFF-AICTE-000' }),
    });

    const res = await loginPost(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.officer.badgeNumber).toBe('OFF-AICTE-000');
    expect(body.data.officer.name).toBe('Dr. S. K. Rao (Central Admin)');
    expect(res.headers.get('set-cookie')).toBeDefined();
  });
});
