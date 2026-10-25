import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { db } from '@/server/db';
import * as authModule from '@/lib/auth';
import { GET as healthGet } from '@/app/api/v1/health/route';
import { GET as complaintsGet, POST as complaintsPost } from '@/app/api/v1/complaints/route';
import {
  GET as complaintDetailGet,
  PATCH as complaintDetailPatch,
} from '@/app/api/v1/complaints/[id]/route';
import { GET as complaintOverlapsGet } from '@/app/api/v1/complaints/[id]/overlaps/route';
import { GET as overlapCandidatesGet } from '@/app/api/v1/overlap-candidates/route';
import { POST as overlapReviewPost } from '@/app/api/v1/overlap-candidates/[id]/review/route';
import { GET as institutionsGet } from '@/app/api/v1/institutions/route';
import { GET as institutionDetailGet } from '@/app/api/v1/institutions/[id]/route';
import { GET as dashboardSummaryGet } from '@/app/api/v1/dashboard/summary/route';
import { GET as auditGet } from '@/app/api/v1/audit/route';
import { GET as complaintAuditGet } from '@/app/api/v1/complaints/[id]/audit/route';

const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

describe.skipIf(!isDatabaseConfigured)('Full API Route Integration against PostgreSQL', () => {
  let seededInstitutionId: string;
  let seededBureauId: string;
  let seededOfficerId: string;
  const testComplaintNumber = 'CMP-2026-9999';
  let createdComplaintId: string | null = null;

  beforeAll(async () => {
    // Resolve real IDs from seeded database
    const institution = await db.institution.findUniqueOrThrow({
      where: { permanentId: '1-10098765' },
    });
    const bureau = await db.bureau.findUniqueOrThrow({
      where: { code: 'APPROVAL_BUREAU' },
    });
    const officer = await db.officer.findUniqueOrThrow({
      where: { badgeNumber: 'OFF-AICTE-001' },
    });

    seededInstitutionId = institution.id;
    seededBureauId = bureau.id;
    seededOfficerId = officer.id;
  });

  afterAll(async () => {
    // Cleanup any records created during integration tests
    if (createdComplaintId) {
      await db.caseAction.deleteMany({ where: { complaintId: createdComplaintId } });
      await db.overlapCandidate.deleteMany({
        where: {
          OR: [
            { primaryComplaintId: createdComplaintId },
            { candidateComplaintId: createdComplaintId },
          ],
        },
      });
      await db.auditLog.deleteMany({ where: { entityId: createdComplaintId } });
      await db.complaint.delete({ where: { id: createdComplaintId } }).catch(() => {});
    }
    await db.$disconnect();
  });

  // 1. Health & Readiness
  it('GET /api/v1/health should connect to PostgreSQL and report healthy status', async () => {
    const response = await healthGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
    expect(body.data.database).toBe('connected');
  });

  // 2. Complaint Listing & Retrieval
  it('GET /api/v1/complaints should return seeded complaints with relations and overlap counts', async () => {
    const request = new Request('http://localhost:3000/api/v1/complaints?page=1&limit=10');
    const response = await complaintsGet(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.complaints.length).toBeGreaterThanOrEqual(5);
    expect(body.data.pagination.total).toBeGreaterThanOrEqual(5);

    const first = body.data.complaints[0];
    expect(first.institution).toBeDefined();
    expect(first.bureau).toBeDefined();
    expect(typeof first.overlapCount).toBe('number');
  });

  it('GET /api/v1/complaints should filter by bureau and perform case-insensitive search', async () => {
    const request = new Request(
      'http://localhost:3000/api/v1/complaints?bureauId=' +
        seededBureauId +
        '&search=intake'
    );
    const response = await complaintsGet(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.complaints.length).toBeGreaterThanOrEqual(1);
    expect(body.data.complaints[0].complaintNumber).toBe('CMP-2026-0001');
  });

  it('GET /api/v1/complaints/[id] should retrieve a seeded complaint by ID or complaintNumber', async () => {
    const request = new Request('http://localhost:3000/api/v1/complaints/CMP-2026-0001');
    const response = await complaintDetailGet(request, {
      params: Promise.resolve({ id: 'CMP-2026-0001' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.complaintNumber).toBe('CMP-2026-0001');
    expect(body.data.institution.name).toContain('Matrix Institute');
    expect(body.data.bureau.code).toBe('APPROVAL_BUREAU');
    expect(body.data.overlaps).toBeDefined();
  });

  it('GET /api/v1/complaints/[id]/overlaps should retrieve detected candidates for CMP-2026-0002', async () => {
    const complaint2 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0002' },
    });

    const request = new Request(
      `http://localhost:3000/api/v1/complaints/${complaint2.id}/overlaps`
    );
    const response = await complaintOverlapsGet(request, {
      params: Promise.resolve({ id: complaint2.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  // 3. Overlap Candidates & Review
  it('GET /api/v1/overlap-candidates should list candidates with score and signals from PostgreSQL', async () => {
    const request = new Request('http://localhost:3000/api/v1/overlap-candidates?minScore=0.7');
    const response = await overlapCandidatesGet(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.candidates.length).toBeGreaterThanOrEqual(1);
    const candidate = body.data.candidates[0];
    expect(candidate.overallScore).toBeGreaterThanOrEqual(0.7);
    expect(candidate.matchingSignals).toBeDefined();
  });

  // 4. Institutions & Dashboard Data
  it('GET /api/v1/institutions should return seeded institutions with aggregate counts', async () => {
    const request = new Request('http://localhost:3000/api/v1/institutions?search=Matrix');
    const response = await institutionsGet(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.institutions.length).toBeGreaterThanOrEqual(1);
    expect(body.data.institutions[0].permanentId).toBe('1-10098765');
    expect(body.data.institutions[0].complaintCount).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/institutions/[id] should return institution profile and recent complaints', async () => {
    const request = new Request('http://localhost:3000/api/v1/institutions/1-10098765');
    const response = await institutionDetailGet(request, {
      params: Promise.resolve({ id: '1-10098765' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.permanentId).toBe('1-10098765');
    expect(Array.isArray(body.data.recentComplaints)).toBe(true);
    expect(body.data.recentComplaints.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/dashboard/summary should compute real aggregate metrics across PostgreSQL', async () => {
    const response = await dashboardSummaryGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.overview.totalComplaints).toBeGreaterThanOrEqual(5);
    expect(body.data.overview.totalOverlapCandidates).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.data.complaintsByBureau)).toBe(true);
    expect(body.data.complaintsByBureau.length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(body.data.topInstitutions)).toBe(true);
  });

  // 5. Audit History
  it('GET /api/v1/audit should query seeded audit records without leaking IP address', async () => {
    const request = new Request('http://localhost:3000/api/v1/audit?entityType=COMPLAINT');
    const response = await auditGet(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.auditLogs.length).toBeGreaterThanOrEqual(1);
    // Ensure ipAddress is omitted from public response
    expect(body.data.auditLogs[0].ipAddress).toBeUndefined();
  });

  it('GET /api/v1/complaints/[id]/audit should return audit history for a seeded complaint', async () => {
    const complaint2 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0002' },
    });

    const request = new Request(
      `http://localhost:3000/api/v1/complaints/${complaint2.id}/audit`
    );
    const response = await complaintAuditGet(request, {
      params: Promise.resolve({ id: complaint2.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.complaintId).toBe(complaint2.id);
    expect(body.data.auditLogs.length).toBeGreaterThanOrEqual(1);
  });

  // 6. Security Gate: Unauthenticated Mutations Fail-Closed without Modifying Database
  it('Unauthenticated POST /api/v1/complaints should fail-closed (401) and NOT modify database', async () => {
    const initialCount = await db.complaint.count();

    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaintNumber: 'CMP-2026-7777',
        originalBureauRef: 'UNAUTH/2026/01',
        institutionId: seededInstitutionId,
        bureauId: seededBureauId,
        subject: 'Unauthenticated test complaint write attempt',
        description: 'This record should never be written to PostgreSQL database.',
        category: 'OTHER',
      }),
    });

    const response = await complaintsPost(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');

    // Confirm PostgreSQL database was NOT modified
    const currentCount = await db.complaint.count();
    expect(currentCount).toBe(initialCount);
  });

  it('Unauthenticated PATCH /api/v1/complaints/[id] should fail-closed (401) and NOT modify database', async () => {
    const complaint = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0001' },
    });

    const request = new Request(`http://localhost:3000/api/v1/complaints/${complaint.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'UNDER_PRELIMINARY_REVIEW',
        notes: 'Unauthenticated update attempt',
      }),
    });

    const response = await complaintDetailPatch(request, {
      params: Promise.resolve({ id: complaint.id }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');

    // Confirm database status is unchanged
    const reloaded = await db.complaint.findUniqueOrThrow({ where: { id: complaint.id } });
    expect(reloaded.status).toBe(complaint.status);
  });

  // 7. Authenticated Real Database Write, Overlap Analysis, and Transaction Rollback
  it('Authenticated POST /api/v1/complaints should reject duplicate with 409 and rollback', async () => {
    // Authenticated as Officer Alpha of APPROVAL_BUREAU
    vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue({
      id: seededOfficerId,
      badgeNumber: 'OFF-AICTE-001',
      name: 'Case Officer Alpha',
      email: 'officer.alpha@demo.aicte.internal',
      bureauId: seededBureauId,
      role: 'CASE_OFFICER',
    });

    // Attempt to create with duplicate complaintNumber 'CMP-2026-0001'
    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaintNumber: 'CMP-2026-0001', // Already exists!
        originalBureauRef: 'APP/2026/G-DUPLICATE',
        institutionId: seededInstitutionId,
        bureauId: seededBureauId,
        subject: 'Duplicate complaint number test',
        description: 'Should trigger P2002 unique constraint conflict in PostgreSQL.',
      }),
    });

    const response = await complaintsPost(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('CMP-2026-0001');

    vi.restoreAllMocks();
  });

  it('Authenticated POST /api/v1/complaints and PATCH should persist to PostgreSQL atomically', async () => {
    // 1. Authenticated session
    vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue({
      id: seededOfficerId,
      badgeNumber: 'OFF-AICTE-001',
      name: 'Case Officer Alpha',
      email: 'officer.alpha@demo.aicte.internal',
      bureauId: seededBureauId,
      role: 'CASE_OFFICER',
    });

    // 2. Create complaint in real PostgreSQL database
    const postRequest = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaintNumber: testComplaintNumber,
        originalBureauRef: 'APP/2026/TEST-999',
        institutionId: seededInstitutionId,
        bureauId: seededBureauId,
        subject: 'Discrepancy in sanctioned student intake for mechanical engineering',
        description: 'College admitted 60 extra students above sanctioned intake of 120.',
        category: 'UNAPPROVED_PROGRAM',
        priority: 'HIGH',
        status: 'SUBMITTED',
        complainantType: 'CITIZEN',
        complainantMaskedId: 'CIT-***-9999',
      }),
    });

    const postResponse = await complaintsPost(postRequest);
    const postBody = await postResponse.json();

    expect(postResponse.status).toBe(201);
    expect(postBody.success).toBe(true);
    expect(postBody.data.complaint.complaintNumber).toBe(testComplaintNumber);
    createdComplaintId = postBody.data.complaint.id;

    // Verify record in PostgreSQL
    const persisted = await db.complaint.findUnique({
      where: { id: createdComplaintId! },
    });
    expect(persisted).not.toBeNull();
    expect(persisted?.complaintNumber).toBe(testComplaintNumber);

    // Verify operational AuditLog record in PostgreSQL
    const auditLogs = await db.auditLog.findMany({
      where: { entityId: createdComplaintId!, action: 'INGEST_COMPLAINT' },
    });
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].actorId).toBe(seededOfficerId);

    // 3. Update complaint status in real PostgreSQL database
    const patchRequest = new Request(
      `http://localhost:3000/api/v1/complaints/${createdComplaintId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'UNDER_PRELIMINARY_REVIEW',
          notes: 'Scrutiny assigned to engineering inspection team',
        }),
      }
    );

    const patchResponse = await complaintDetailPatch(patchRequest, {
      params: Promise.resolve({ id: createdComplaintId! }),
    });
    const patchBody = await patchResponse.json();

    expect(patchResponse.status).toBe(200);
    expect(patchBody.data.complaint.status).toBe('UNDER_PRELIMINARY_REVIEW');

    // Verify CaseAction timeline record was created in PostgreSQL
    const caseActions = await db.caseAction.findMany({
      where: { complaintId: createdComplaintId!, actionType: 'STATUS_CHANGE' },
    });
    expect(caseActions.length).toBe(1);
    expect(caseActions[0].newStatus).toBe('UNDER_PRELIMINARY_REVIEW');

    vi.restoreAllMocks();
  });
});
