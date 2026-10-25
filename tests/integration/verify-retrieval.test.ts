import { describe, expect, it } from 'vitest';
import { GET as healthGet } from '@/app/api/v1/health/route';
import { GET as institutionsGet } from '@/app/api/v1/institutions/route';
import { GET as complaintsGet } from '@/app/api/v1/complaints/route';
import { GET as dashboardGet } from '@/app/api/v1/dashboard/summary/route';
import { GET as overlapsGet } from '@/app/api/v1/overlap-candidates/route';

describe('Live API Entity Verification', () => {
  it('verifies /api/v1/health reports connected database', async () => {
    const res = await healthGet();
    const body = await res.json();
    console.log('[VERIFY] Health Response:', JSON.stringify(body));
    expect(res.status).toBe(200);
    expect(body.data.status).toBe('healthy');
    expect(body.data.database).toBe('connected');
  });

  it('retrieves seeded institutions from PostgreSQL', async () => {
    const req = new Request('http://localhost:3000/api/v1/institutions?limit=5');
    const res = await institutionsGet(req);
    const body = await res.json();
    console.log('[VERIFY] Institutions Total:', body.data.pagination.total);
    console.log(
      '[VERIFY] Institutions Sample:',
      body.data.institutions.map((i: any) => `${i.permanentId}: ${i.name}`)
    );
    expect(res.status).toBe(200);
    expect(body.data.institutions.length).toBeGreaterThanOrEqual(3);
  });

  it('retrieves seeded complaints from PostgreSQL', async () => {
    const req = new Request('http://localhost:3000/api/v1/complaints?limit=10');
    const res = await complaintsGet(req);
    const body = await res.json();
    console.log('[VERIFY] Complaints Total:', body.data.pagination.total);
    console.log(
      '[VERIFY] Complaints Sample:',
      body.data.complaints.map((c: any) => `${c.complaintNumber} [${c.bureau.code}]: ${c.status}`)
    );
    expect(res.status).toBe(200);
    expect(body.data.complaints.length).toBeGreaterThanOrEqual(5);
  });

  it('retrieves dashboard summary from PostgreSQL', async () => {
    const res = await dashboardGet();
    const body = await res.json();
    console.log('[VERIFY] Dashboard Overview:', JSON.stringify(body.data.overview));
    expect(res.status).toBe(200);
    expect(body.data.overview.totalComplaints).toBeGreaterThanOrEqual(5);
    expect(body.data.overview.totalOverlapCandidates).toBeGreaterThanOrEqual(1);
  });
});
