import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/complaints/route';
import { db } from '@/server/db';
import * as authModule from '@/lib/auth';
import * as auditModule from '@/modules/audit/service';
import * as overlapModule from '@/modules/overlap-detection';

describe('POST /api/v1/complaints Route Handler', () => {
  const mockOfficer: authModule.AuthenticatedOfficer = {
    id: 'officer-test-001',
    badgeNumber: 'OFF-AICTE-001',
    name: 'Inspector Alpha',
    email: 'officer.alpha@demo.aicte.internal',
    bureauId: 'bureau-test-001',
    role: 'CASE_OFFICER',
  };

  const validPayload = {
    complaintNumber: 'CMP-2026-0009',
    originalBureauRef: 'APP/2026/G-999',
    institutionId: 'inst-test-001',
    bureauId: 'bureau-test-001',
    subject: 'Unauthorized fee collection in engineering department',
    description: 'Institution collected 50,000 INR additional unapproved development fees.',
    category: 'FEE_ANOMALY',
    priority: 'HIGH',
    status: 'SUBMITTED',
    complainantType: 'STUDENT',
    complainantMaskedId: 'STU-***-8822',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Malformed JSON
  it('should return 400 when request body contains malformed JSON', async () => {
    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ broken json: true, ',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('INVALID_JSON');
    expect(body.error.message).toContain('Malformed or invalid JSON');
    expect(body.meta.requestId).toBeDefined();
    expect(body.meta.timestamp).toBeDefined();
  });

  // 2. Schema validation failures
  it('should return 400 when payload violates createComplaintSchema with missing fields', async () => {
    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toBeDefined();
  });

  it('should return 400 when complaintNumber regex is invalid', async () => {
    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        complaintNumber: 'INVALID-NUMBER-123',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(body.error.details)).toContain('Expected format CMP-YYYY-XXXXX');
  });

  it('should return 400 when subject or description is too short', async () => {
    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        subject: 'Bad',
        description: 'Short',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  // 3. Security Gate — Unauthenticated request rejected before database mutation
  it('should fail closed with 401 when unauthenticated before any database write', async () => {
    // resolveAuthenticatedOfficer default returns null
    const txSpy = vi.spyOn(db, '$transaction');

    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toContain('Authentication required');
    // Ensure no database transaction or creation was even attempted
    expect(txSpy).not.toHaveBeenCalled();
  });

  it('should reject with 403 FORBIDDEN when officer attempts to ingest complaint for another bureau', async () => {
    const foreignOfficer: authModule.AuthenticatedOfficer = {
      ...mockOfficer,
      bureauId: 'different-bureau-999',
      role: 'CASE_OFFICER',
    };
    vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(foreignOfficer);

    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('can only ingest complaints for their assigned bureau');
  });

  // 4. Missing referenced relations
  it('should return 404 when referenced institution is not found', async () => {
    vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
    vi.spyOn(db.institution, 'findUnique').mockResolvedValue(null);
    vi.spyOn(db.bureau, 'findUnique').mockResolvedValue({ id: 'bureau-test-001' } as any);

    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain("Institution with ID 'inst-test-001' was not found");
  });

  it('should return 404 when referenced bureau is not found', async () => {
    vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
    vi.spyOn(db.institution, 'findUnique').mockResolvedValue({ id: 'inst-test-001' } as any);
    vi.spyOn(db.bureau, 'findUnique').mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain("Bureau with ID 'bureau-test-001' was not found");
  });

  it('should return 404 when referenced assigned officer is not found', async () => {
    vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
    vi.spyOn(db.institution, 'findUnique').mockResolvedValue({ id: 'inst-test-001' } as any);
    vi.spyOn(db.bureau, 'findUnique').mockResolvedValue({ id: 'bureau-test-001' } as any);
    vi.spyOn(db.officer, 'findUnique').mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        assignedOfficerId: 'officer-missing-999',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain("Assigned officer with ID 'officer-missing-999' was not found");
  });

  // 5. Conflict handling (P2002)
  it('should return 409 when complaintNumber already exists', async () => {
    vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
    vi.spyOn(db.institution, 'findUnique').mockResolvedValue({ id: 'inst-test-001' } as any);
    vi.spyOn(db.bureau, 'findUnique').mockResolvedValue({ id: 'bureau-test-001' } as any);
    vi.spyOn(db, '$transaction').mockRejectedValue({ code: 'P2002' });

    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('CMP-2026-0009');
  });

  // 6. Safe database error handling
  it('should return 500 without leaking connection credentials if database write fails', async () => {
    vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
    vi.spyOn(db.institution, 'findUnique').mockResolvedValue({ id: 'inst-test-001' } as any);
    vi.spyOn(db.bureau, 'findUnique').mockResolvedValue({ id: 'bureau-test-001' } as any);
    vi.spyOn(db, '$transaction').mockRejectedValue(
      new Error('Connection failed: postgresql://postgres:super_secret@db.internal:5432')
    );

    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(JSON.stringify(body)).not.toContain('super_secret');
    expect(JSON.stringify(body)).not.toContain('db.internal');
  });

  // 7. Overlap analysis failure handling
  it('should return 500 OVERLAP_ANALYSIS_FAILED if analysis throws, preserving created complaint and logging audit failure', async () => {
    vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
    vi.spyOn(db.institution, 'findUnique').mockResolvedValue({ id: 'inst-test-001' } as any);
    vi.spyOn(db.bureau, 'findUnique').mockResolvedValue({ id: 'bureau-test-001' } as any);

    const mockComplaint = {
      id: 'cmp_created_001',
      complaintNumber: 'CMP-2026-0009',
      bureauId: 'bureau-test-001',
    };

    vi.spyOn(db, '$transaction').mockResolvedValue(mockComplaint as any);
    vi.spyOn(overlapModule, 'analyzeAndPersistOverlaps').mockRejectedValue(
      new Error('Overlap scan worker out of memory')
    );
    const auditSpy = vi.spyOn(auditModule, 'createAuditLog').mockResolvedValue({} as any);

    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('OVERLAP_ANALYSIS_FAILED');
    expect(body.error.details.complaintId).toBe('cmp_created_001');
    expect(body.error.details.complaintNumber).toBe('CMP-2026-0009');
    // Verify an audit log for the failure was attempted
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OVERLAP_ANALYSIS_FAILED',
        entityId: 'cmp_created_001',
      })
    );
  });

  // 8. Successful authenticated creation
  it('should successfully create complaint, invoke audit log, and return 201 with overlap summary when authenticated', async () => {
    vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
    vi.spyOn(db.institution, 'findUnique').mockResolvedValue({ id: 'inst-test-001' } as any);
    vi.spyOn(db.bureau, 'findUnique').mockResolvedValue({ id: 'bureau-test-001' } as any);

    const mockComplaint = {
      id: 'cmp_created_002',
      complaintNumber: 'CMP-2026-0009',
      bureauId: 'bureau-test-001',
      subject: validPayload.subject,
      description: validPayload.description,
      institution: { id: 'inst-test-001', name: 'Test Institute' },
      bureau: { id: 'bureau-test-001', code: 'APPROVAL_BUREAU' },
    };

    const mockAuditLog = { id: 'audit-001' };

    vi.spyOn(db, '$transaction').mockImplementation(async (callback: any) => {
      return callback({
        complaint: {
          create: vi.fn().mockResolvedValue(mockComplaint),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue(mockAuditLog),
        },
      });
    });

    const mockOverlapResult = {
      complaintId: 'cmp_created_002',
      evaluatedPoolSize: 15,
      detectedCandidateCount: 1,
      candidates: [
        {
          primaryComplaintId: 'cmp_created_002',
          candidateComplaintId: 'cmp_other_001',
          overallScore: 0.82,
        },
      ],
    };

    const overlapSpy = vi
      .spyOn(overlapModule, 'analyzeAndPersistOverlaps')
      .mockResolvedValue(mockOverlapResult as any);

    const request = new Request('http://localhost:3000/api/v1/complaints', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '192.168.1.100',
      },
      body: JSON.stringify(validPayload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.error).toBeNull();
    expect(body.data.complaint.id).toBe('cmp_created_002');
    expect(body.data.overlaps.evaluatedPoolSize).toBe(15);
    expect(body.data.overlaps.detectedCandidateCount).toBe(1);
    expect(body.meta.requestId).toBeDefined();
    expect(overlapSpy).toHaveBeenCalledWith('cmp_created_002');
  });
});
