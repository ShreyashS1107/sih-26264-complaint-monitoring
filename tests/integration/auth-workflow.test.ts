import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/server/db';
import { POST as loginPost } from '@/app/api/v1/auth/login/route';
import { GET as meGet } from '@/app/api/v1/auth/me/route';
import { POST as logoutPost } from '@/app/api/v1/auth/logout/route';
import { GET as officersGet } from '@/app/api/v1/auth/officers/route';
import { PATCH as complaintPatch } from '@/app/api/v1/complaints/[id]/route';

const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

describe.skipIf(!isDatabaseConfigured)('End-to-End Authentication & Authorization Workflow', () => {
  const seededOfficerBadge = 'OFF-AICTE-001';
  const seededOfficerEmail = 'officer.alpha@demo.aicte.internal';
  const adminOfficerBadge = 'OFF-AICTE-000';
  const adminOfficerEmail = 'dr.sk.rao@demo.aicte.internal';
  let activeToken: string;

  beforeAll(async () => {
    // Confirm officers exist
    const officer = await db.officer.findUnique({ where: { badgeNumber: seededOfficerBadge } });
    if (!officer) {
      throw new Error('Seeded officer not found');
    }
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('POST /api/v1/auth/login should reject non-existent officer with 401', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        badgeNumber: 'NON-EXISTENT-999',
        email: 'invalid@aicte.internal',
      }),
    });

    const res = await loginPost(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /api/v1/auth/login should authenticate valid officer and return signed token & cookie', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        badgeNumber: seededOfficerBadge,
        email: seededOfficerEmail,
      }),
    });

    const res = await loginPost(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(typeof body.data.token).toBe('string');
    expect(body.data.officer.badgeNumber).toBe(seededOfficerBadge);
    expect(body.data.officer.role).toBe('CASE_OFFICER');

    // Verify Set-Cookie header was attached
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('aicte_officer_session=');
    expect(setCookie).toContain('HttpOnly');

    activeToken = body.data.token;
  });

  it('GET /api/v1/auth/me should return 401 when called without credentials', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/me');
    const res = await meGet(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/auth/me should return authenticated officer profile when called with Bearer token', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/me', {
      headers: { authorization: `Bearer ${activeToken}` },
    });
    const res = await meGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.officer.badgeNumber).toBe(seededOfficerBadge);
    expect(body.data.officer.bureau).toBeDefined();
  });

  it('GET /api/v1/auth/me should return authenticated officer profile when called with session cookie', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/me', {
      headers: { cookie: `aicte_officer_session=${activeToken}` },
    });
    const res = await meGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.officer.badgeNumber).toBe(seededOfficerBadge);
  });

  it('GET /api/v1/auth/officers should list all active institutional officers', async () => {
    const res = await officersGet();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.officers.length).toBeGreaterThanOrEqual(3);
  });

  it('POST /api/v1/auth/logout should clear session cookie', async () => {
    const req = new Request('http://localhost:3000/api/v1/auth/logout', {
      method: 'POST',
      headers: { authorization: `Bearer ${activeToken}` },
    });
    const res = await logoutPost(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('Max-Age=0');
  });

  it('Authenticated officer can execute protected write mutation using signed token', async () => {
    // 1. Login as Central Admin to perform permitted updates across bureaus
    const loginReq = new Request('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        badgeNumber: adminOfficerBadge,
        email: adminOfficerEmail,
      }),
    });
    const loginRes = await loginPost(loginReq);
    const loginBody = await loginRes.json();
    const adminToken = loginBody.data.token;

    // 2. Perform protected PATCH /api/v1/complaints/CMP-2026-0001
    const complaint = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0001' },
    });

    const patchReq = new Request(`http://localhost:3000/api/v1/complaints/${complaint.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        priority: 'CRITICAL',
        notes: 'Priority elevated by Central Admin due to excessive intake discrepancy.',
      }),
    });

    const patchRes = await complaintPatch(patchReq, {
      params: Promise.resolve({ id: complaint.id }),
    });
    const patchBody = await patchRes.json();

    expect(patchRes.status).toBe(200);
    expect(patchBody.success).toBe(true);
    expect(patchBody.data.complaint.priority).toBe('CRITICAL');

    // 3. Confirm update in PostgreSQL
    const updated = await db.complaint.findUniqueOrThrow({ where: { id: complaint.id } });
    expect(updated.priority).toBe('CRITICAL');

    // 4. Confirm AuditLog was recorded
    const auditLogs = await db.auditLog.findMany({
      where: { entityId: complaint.id, action: 'UPDATE_COMPLAINT' },
      orderBy: { timestamp: 'desc' },
      take: 1,
    });
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].actorRole).toBe('CENTRAL_ADMIN');

    // Restore priority back to HIGH
    await db.complaint.update({
      where: { id: complaint.id },
      data: { priority: 'HIGH' },
    });
  });
});
