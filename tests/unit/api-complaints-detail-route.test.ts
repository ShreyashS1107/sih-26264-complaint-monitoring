import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/v1/complaints/[id]/route';
import { db } from '@/server/db';
import * as authModule from '@/lib/auth';
import * as auditModule from '@/modules/audit/service';
import * as overlapModule from '@/modules/overlap-detection';

describe('Complaints Detail Route Handler (/api/v1/complaints/[id])', () => {
  const mockOfficer: authModule.AuthenticatedOfficer = {
    id: 'officer-test-001',
    badgeNumber: 'OFF-AICTE-001',
    name: 'Inspector Alpha',
    email: 'officer.alpha@demo.aicte.internal',
    bureauId: 'bureau-test-001',
    role: 'CASE_OFFICER',
  };

  const sampleComplaint = {
    id: 'cmp_test_001',
    complaintNumber: 'CMP-2026-0001',
    originalBureauRef: 'APP/2026/G-881',
    institutionId: 'inst_001',
    bureauId: 'bureau-test-001',
    assignedOfficerId: 'officer-test-001',
    subject: 'Excess student intake detected',
    description: 'Admitted 180 students instead of approved 120.',
    category: 'UNAPPROVED_PROGRAM',
    priority: 'HIGH',
    status: 'SUBMITTED',
    incidentDate: null,
    complainantType: 'CITIZEN',
    complainantMaskedId: 'CIT-***-4410',
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    institution: { id: 'inst_001', name: 'Matrix Institute' },
    bureau: { id: 'bureau-test-001', code: 'APPROVAL_BUREAU', name: 'Approval Bureau' },
    assignedOfficer: {
      id: 'officer-test-001',
      badgeNumber: 'OFF-AICTE-001',
      name: 'Inspector Alpha',
      email: 'officer.alpha@demo.aicte.internal',
      role: 'CASE_OFFICER',
    },
    caseActions: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db.auditLog, 'findFirst').mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/complaints/[id]', () => {
    it('should return 400 for empty or invalid complaint ID', async () => {
      const request = new Request('http://localhost:3000/api/v1/complaints//');
      const response = await GET(request, { params: Promise.resolve({ id: '   ' }) });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('INVALID_COMPLAINT_ID');
    });

    it('should return 404 when complaint does not exist', async () => {
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/v1/complaints/missing_id');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'missing_id' }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('COMPLAINT_NOT_FOUND');
    });

    it('should return 200 with complaint details and overlap candidates', async () => {
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(sampleComplaint as any);
      vi.spyOn(overlapModule, 'getOverlapCandidatesForComplaint').mockResolvedValue([
        { id: 'cand_01', overallScore: 0.9 } as any,
      ]);

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('cmp_test_001');
      expect(body.data.overlaps.count).toBe(1);
      expect(body.data.overlaps.candidates[0].id).toBe('cand_01');
    });

    it('should return evidentiary attachments and allegations from ingestion audit log when present', async () => {
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(sampleComplaint as any);
      vi.spyOn(overlapModule, 'getOverlapCandidatesForComplaint').mockResolvedValue([]);
      vi.spyOn(db.auditLog, 'findFirst').mockResolvedValue({
        id: 'aud_ingest_01',
        entityType: 'COMPLAINT',
        entityId: 'cmp_test_001',
        action: 'INGEST_COMPLAINT',
        details: {
          evidence: [
            {
              id: 'DOC-001',
              name: 'Demand_Notice.pdf',
              fileSize: '1.2 MB',
              uploadDate: '2026-09-12',
              category: 'Fee Receipt',
            },
          ],
          allegations: ['Unauthorized capitation fee demanded in cash'],
        },
      } as any);

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.evidence).toHaveLength(1);
      expect(body.data.evidence[0].name).toBe('Demand_Notice.pdf');
      expect(body.data.allegations).toEqual(['Unauthorized capitation fee demanded in cash']);
    });

    it('should return empty evidence array and subject allegation when no evidentiary attachments exist', async () => {
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(sampleComplaint as any);
      vi.spyOn(overlapModule, 'getOverlapCandidatesForComplaint').mockResolvedValue([]);
      vi.spyOn(db.auditLog, 'findFirst').mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.evidence).toEqual([]);
      expect(body.data.allegations).toEqual([sampleComplaint.subject]);
    });

    it('should support lookup by unique complaintNumber as well as CUID id', async () => {
      const findFirstSpy = vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(sampleComplaint as any);
      vi.spyOn(overlapModule, 'getOverlapCandidatesForComplaint').mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/v1/complaints/CMP-2026-0001');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'CMP-2026-0001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(findFirstSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ id: 'CMP-2026-0001' }, { complaintNumber: 'CMP-2026-0001' }],
          },
        })
      );
    });

    it('should return 400 for undefined, null, or empty string ID parameter', async () => {
      for (const invalidId of ['undefined', 'null', '   ']) {
        const request = new Request(`http://localhost:3000/api/v1/complaints/${invalidId}`);
        const response = await GET(request, { params: Promise.resolve({ id: invalidId }) });
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe('INVALID_COMPLAINT_ID');
      }
    });
  });

  describe('PATCH /api/v1/complaints/[id]', () => {
    it('should fail closed with 401 when unauthenticated and prototype mode is authenticated', async () => {
      const origEnv = process.env.PROTOTYPE_ACCESS_MODE;
      process.env.PROTOTYPE_ACCESS_MODE = 'authenticated';
      try {
        const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'UNDER_PRELIMINARY_REVIEW',
            notes: 'Moving to preliminary review stage',
          }),
        });

        const response = await PATCH(request, {
          params: Promise.resolve({ id: 'cmp_test_001' }),
        });
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe('UNAUTHORIZED');
      } finally {
        process.env.PROTOTYPE_ACCESS_MODE = origEnv;
      }
    });

    it('should allow status update without authentication in default prototype mode', async () => {
      const existingComplaint = {
        id: 'cmp_test_001',
        complaintNumber: 'CMP-2026-0001',
        bureauId: 'bureau-test-001',
        status: 'SUBMITTED',
        priority: 'MEDIUM',
        category: 'FEE_ANOMALY',
      };

      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(existingComplaint as any);

      const mockUpdated = {
        ...existingComplaint,
        status: 'UNDER_PRELIMINARY_REVIEW',
      };

      vi.spyOn(db, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          complaint: { update: vi.fn().mockResolvedValue(mockUpdated) },
          caseAction: { create: vi.fn().mockResolvedValue({ id: 'act_01' }) },
        });
      });
      const auditSpy = vi.spyOn(auditModule, 'createAuditLog').mockResolvedValue({} as any);

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'UNDER_PRELIMINARY_REVIEW',
          notes: 'Moving to preliminary review stage',
        }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.complaint.status).toBe('UNDER_PRELIMINARY_REVIEW');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_COMPLAINT',
          actorId: null,
          actorRole: 'PROTOTYPE_REVIEWER',
        }),
        expect.anything()
      );
    });

    it('should return 400 on malformed JSON body', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{ broken json ',
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('INVALID_JSON');
    });

    it('should return 400 when no valid change fields are provided or note is missing', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: 'Only a note without any status/priority/officer update',
        }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('NO_CHANGES_REQUESTED');
    });

    it('should return 404 when target complaint is not found', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/v1/complaints/missing_id', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'UNDER_PRELIMINARY_REVIEW',
          notes: 'Starting review',
        }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'missing_id' }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('COMPLAINT_NOT_FOUND');
    });

    it('should reject with 403 FORBIDDEN when officer attempts to modify a complaint of another bureau', async () => {
      const foreignOfficer: authModule.AuthenticatedOfficer = {
        ...mockOfficer,
        id: 'officer-other-999',
        bureauId: 'bureau-other-999',
        role: 'CASE_OFFICER',
      };
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(foreignOfficer);
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(sampleComplaint as any);

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'UNDER_PRELIMINARY_REVIEW',
          notes: 'Attempting cross-bureau status update',
        }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain(
        'not authorized to modify complaints belonging to another bureau'
      );
    });

    it('should reject invalid status transitions (e.g., SUBMITTED -> RESOLVED directly)', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue({
        ...sampleComplaint,
        status: 'SUBMITTED',
      } as any);

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          notes: 'Direct resolution without preliminary review or inquiry',
        }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(body.error.message).toContain(
        "Transition from 'SUBMITTED' to 'RESOLVED' is not permitted"
      );
    });

    it('should successfully update complaint status by complaintNumber AICTE-2026-8404', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      const targetComplaint = {
        ...sampleComplaint,
        id: 'cuid_aicte_8404',
        complaintNumber: 'AICTE-2026-8404',
        status: 'SUBMITTED',
      };
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(targetComplaint as any);

      const mockUpdated = {
        ...targetComplaint,
        status: 'UNDER_PRELIMINARY_REVIEW',
      };

      vi.spyOn(db, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          complaint: {
            update: vi.fn().mockResolvedValue(mockUpdated),
          },
          caseAction: {
            create: vi.fn().mockResolvedValue({ id: 'act_002', complaintId: targetComplaint.id }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'aud_002' }),
          },
        });
      });

      const request = new Request('http://localhost:3000/api/v1/complaints/AICTE-2026-8404', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'UNDER_PRELIMINARY_REVIEW',
          notes: 'Verified valid procedural transition by complaint number identifier',
        }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'AICTE-2026-8404' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.complaint.status).toBe('UNDER_PRELIMINARY_REVIEW');
    });

    it('should successfully update complaint status, create timeline action, and log audit trail when authenticated', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue({
        ...sampleComplaint,
        status: 'SUBMITTED',
      } as any);

      const mockUpdated = {
        ...sampleComplaint,
        status: 'UNDER_PRELIMINARY_REVIEW',
      };

      vi.spyOn(db, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          complaint: {
            update: vi.fn().mockResolvedValue(mockUpdated),
          },
          caseAction: {
            create: vi.fn().mockResolvedValue({ id: 'act_001' }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'aud_001' }),
          },
        });
      });

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'UNDER_PRELIMINARY_REVIEW',
          notes: 'Commencing initial scrutiny by Approval Bureau',
        }),
      });

      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.complaint.status).toBe('UNDER_PRELIMINARY_REVIEW');
    });
  });

  describe('DELETE /api/v1/complaints/[id]', () => {
    it('should return 400 for empty or invalid complaint ID', async () => {
      const request = new Request('http://localhost:3000/api/v1/complaints//', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: '   ' }) });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('INVALID_COMPLAINT_ID');
    });

    it('should return 401 when unauthenticated and prototype mode is authenticated', async () => {
      const origEnv = process.env.PROTOTYPE_ACCESS_MODE;
      process.env.PROTOTYPE_ACCESS_MODE = 'authenticated';
      try {
        const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001', {
          method: 'DELETE',
        });
        const response = await DELETE(request, {
          params: Promise.resolve({ id: 'cmp_test_001' }),
        });
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe('UNAUTHORIZED');
      } finally {
        process.env.PROTOTYPE_ACCESS_MODE = origEnv;
      }
    });

    it('should return 404 when complaint does not exist', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/v1/complaints/missing_cmp', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'missing_cmp' }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('COMPLAINT_NOT_FOUND');
    });

    it('should return 403 when officer from another bureau attempts deletion', async () => {
      const foreignOfficer: authModule.AuthenticatedOfficer = {
        ...mockOfficer,
        id: 'officer-foreign-999',
        bureauId: 'bureau-foreign-999',
        role: 'CASE_OFFICER',
      };
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(foreignOfficer);
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(sampleComplaint as any);

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('should soft-delete / archive to DISMISSED when dependent records exist to preserve audit history', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(sampleComplaint as any);
      vi.spyOn(db.caseAction, 'count').mockResolvedValue(2);
      vi.spyOn(db.overlapCandidate, 'count').mockResolvedValue(1);

      vi.spyOn(db, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          complaint: {
            update: vi.fn().mockResolvedValue({ ...sampleComplaint, status: 'DISMISSED' }),
          },
          caseAction: {
            create: vi.fn().mockResolvedValue({ id: 'act_arch' }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'aud_archive_01' }),
          },
        });
      });

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.action).toBe('ARCHIVED');
      expect(body.data.message).toContain('safely soft-deleted/archived');
    });

    it('should permanently delete complaint when no dependent records exist', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(sampleComplaint as any);
      vi.spyOn(db.caseAction, 'count').mockResolvedValue(0);
      vi.spyOn(db.overlapCandidate, 'count').mockResolvedValue(0);

      vi.spyOn(db, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          complaint: {
            delete: vi.fn().mockResolvedValue(sampleComplaint),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'aud_del_01' }),
          },
        });
      });

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_test_001', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'cmp_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.action).toBe('DELETED');
    });
  });
});
