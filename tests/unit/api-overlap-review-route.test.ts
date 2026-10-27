import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/v1/overlap-candidates/route';
import { POST } from '@/app/api/v1/overlap-candidates/[id]/review/route';
import { db } from '@/server/db';
import * as authModule from '@/lib/auth';
import * as auditModule from '@/modules/audit/service';

describe('Overlap Review Routes (/api/v1/overlap-candidates)', () => {
  const mockOfficer: authModule.AuthenticatedOfficer = {
    id: 'officer-test-001',
    badgeNumber: 'OFF-AICTE-001',
    name: 'Inspector Alpha',
    email: 'officer.alpha@demo.aicte.internal',
    bureauId: 'bureau-test-001',
    role: 'CASE_OFFICER',
  };

  const sampleCandidate = {
    id: 'cand_test_001',
    primaryComplaintId: 'cmp_001',
    candidateComplaintId: 'cmp_002',
    institutionId: 'inst_001',
    overallScore: 0.88,
    entityScore: 1.0,
    subjectScore: 0.85,
    temporalScore: 0.95,
    complainantScore: 0.6,
    matchingSignals: {
      explanation: 'Cross-bureau duplicate filings on fee hike',
    },
    reviewStatus: 'PENDING_REVIEW',
    reviewNotes: null,
    reviewedById: null,
    reviewedAt: null,
    primaryComplaint: {
      id: 'cmp_001',
      complaintNumber: 'CMP-2026-0001',
      bureauId: 'bureau-test-001',
    },
    candidateComplaint: {
      id: 'cmp_002',
      complaintNumber: 'CMP-2026-0002',
      bureauId: 'bureau_002',
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/overlap-candidates', () => {
    it('should list candidates with pagination and filtering', async () => {
      vi.spyOn(db.overlapCandidate, 'findMany').mockResolvedValue([sampleCandidate as any]);
      vi.spyOn(db.overlapCandidate, 'count').mockResolvedValue(1);

      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates?status=PENDING_REVIEW&minScore=0.75'
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.candidates.length).toBe(1);
      expect(body.data.pagination.total).toBe(1);
    });

    it('should return 400 on invalid query parameters', async () => {
      const request = new Request('http://localhost:3000/api/v1/overlap-candidates?minScore=2.5');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/overlap-candidates/[id]/review', () => {
    it('should fail closed with 401 when unauthenticated and prototype mode is authenticated', async () => {
      const origEnv = process.env.PROTOTYPE_ACCESS_MODE;
      process.env.PROTOTYPE_ACCESS_MODE = 'authenticated';
      try {
        const request = new Request(
          'http://localhost:3000/api/v1/overlap-candidates/cand_test_001/review',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              decision: 'CONFIRMED_OVERLAP',
              notes: 'Both complaints describe the exact same unapproved building levy.',
            }),
          }
        );

        const response = await POST(request, {
          params: Promise.resolve({ id: 'cand_test_001' }),
        });
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error.code).toBe('UNAUTHORIZED');
      } finally {
        process.env.PROTOTYPE_ACCESS_MODE = origEnv;
      }
    });

    it('should allow review without authentication when prototype mode is open', async () => {
      vi.spyOn(db.overlapCandidate, 'findUnique').mockResolvedValue({
        id: 'cand_test_001',
        primaryComplaintId: 'cmp_001',
        candidateComplaintId: 'cmp_002',
        reviewStatus: 'PENDING_REVIEW',
        overallScore: 0.88,
        primaryComplaint: { bureauId: 'bureau-test-001', complaintNumber: 'CMP-2026-0001' },
        candidateComplaint: { bureauId: 'bureau-test-002', complaintNumber: 'CMP-2026-0002' },
      } as any);

      const mockUpdated = {
        id: 'cand_test_001',
        reviewStatus: 'CONFIRMED_OVERLAP',
        reviewedAt: new Date(),
        reviewedById: null,
      };

      vi.spyOn(db, '$transaction').mockImplementation(async (cb: any) => {
        return cb({
          overlapCandidate: {
            update: vi.fn().mockResolvedValue(mockUpdated),
          },
          caseAction: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'aud_proto_01' }),
          },
        });
      });
      const auditSpy = vi.spyOn(auditModule, 'createAuditLog');

      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates/cand_test_001/review',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision: 'CONFIRMED_OVERLAP',
            notes: 'Both complaints describe the exact same unapproved building levy.',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: 'cand_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.candidate.reviewStatus).toBe('CONFIRMED_OVERLAP');
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RECORD_OVERLAP_REVIEW',
          actorId: null,
          actorRole: 'PROTOTYPE_REVIEWER',
        }),
        expect.anything()
      );
    });

    it('should return 400 on malformed JSON body', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);

      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates/cand_test_001/review',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ invalid_json ',
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: 'cand_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('INVALID_JSON');
    });

    it('should return 400 on invalid review decision enum', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);

      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates/cand_test_001/review',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision: 'INVALID_DECISION_TYPE',
            notes: 'Valid explanation note with sufficient length',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: 'cand_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when candidate is not found', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.overlapCandidate, 'findUnique').mockResolvedValue(null);

      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates/missing_cand/review',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision: 'CONFIRMED_OVERLAP',
            notes: 'Valid explanation note with sufficient length',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: 'missing_cand' }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('OVERLAP_CANDIDATE_NOT_FOUND');
    });

    it('should reject with 403 FORBIDDEN when officer is not from an involved bureau and not CENTRAL_ADMIN', async () => {
      const foreignOfficer: authModule.AuthenticatedOfficer = {
        ...mockOfficer,
        bureauId: 'bureau_unrelated_999',
        role: 'CASE_OFFICER',
      };
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(foreignOfficer);
      vi.spyOn(db.overlapCandidate, 'findUnique').mockResolvedValue(sampleCandidate as any);

      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates/cand_test_001/review',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision: 'CONFIRMED_OVERLAP',
            notes: 'Reviewing a candidate that does not belong to my bureau',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: 'cand_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('not authorized to review overlap candidates');
    });

    it('should record review decision, timeline actions on both complaints, and audit log', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.overlapCandidate, 'findUnique').mockResolvedValue(sampleCandidate as any);

      const mockUpdated = {
        ...sampleCandidate,
        reviewStatus: 'CONFIRMED_OVERLAP',
        reviewNotes: 'Verified duplicate filing across Approval and Student Grievance bureaus.',
        reviewedById: mockOfficer.id,
        reviewedAt: new Date(),
      };

      vi.spyOn(db, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          overlapCandidate: {
            update: vi.fn().mockResolvedValue(mockUpdated),
          },
          caseAction: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'aud_review_01' }),
          },
        });
      });

      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates/cand_test_001/review',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision: 'CONFIRMED_OVERLAP',
            notes: 'Verified duplicate filing across Approval and Student Grievance bureaus.',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: 'cand_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.candidate.reviewStatus).toBe('CONFIRMED_OVERLAP');
    });

    it('should successfully record verdict "Pass" with mandatory rationale and institutional directive', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.overlapCandidate, 'findUnique').mockResolvedValue(sampleCandidate as any);

      const mockUpdated = {
        ...sampleCandidate,
        reviewStatus: 'DISMISSED_INDEPENDENT',
        reviewNotes: 'Clear difference in faculty allegations. Institutional Directive: Issue compliance notice regarding student quota.',
        reviewedById: mockOfficer.id,
        reviewedAt: new Date(),
      };

      vi.spyOn(db, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          overlapCandidate: {
            update: vi.fn().mockResolvedValue(mockUpdated),
          },
          caseAction: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'aud_review_02' }),
          },
        });
      });

      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates/cand_test_001/review',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verdict: 'Pass',
            rationale: 'Clear difference in faculty allegations.',
            institutionalDirective: 'Issue compliance notice regarding student quota.',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: 'cand_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.candidate.reviewStatus).toBe('DISMISSED_INDEPENDENT');
      expect(body.data.candidate.reviewNotes).toContain('Institutional Directive:');
    });

    it('should resolve and record adjudication for queue identifier OVL-2026-02', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.overlapCandidate, 'findUnique').mockResolvedValue(null);
      vi.spyOn(db.overlapCandidate, 'findFirst').mockResolvedValue(sampleCandidate as any);

      const mockUpdated = {
        ...sampleCandidate,
        reviewStatus: 'DISMISSED_INDEPENDENT',
        reviewNotes: 'No overlap between 8403 and 8404.',
        reviewedById: mockOfficer.id,
        reviewedAt: new Date(),
      };

      vi.spyOn(db, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          overlapCandidate: {
            update: vi.fn().mockResolvedValue(mockUpdated),
          },
          caseAction: {
            createMany: vi.fn().mockResolvedValue({ count: 2 }),
          },
          auditLog: {
            create: vi.fn().mockResolvedValue({ id: 'aud_review_03' }),
          },
        });
      });

      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates/OVL-2026-02/review',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verdict: 'Pass',
            rationale: 'No overlap between 8403 and 8404.',
            institutionalDirective: 'None',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: 'OVL-2026-02' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.candidate.reviewStatus).toBe('DISMISSED_INDEPENDENT');
    });

    it('should return 400 when mandatory rationale / notes is missing or too short', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.overlapCandidate, 'findUnique').mockResolvedValue(sampleCandidate as any);

      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates/cand_test_001/review',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verdict: 'Pass',
            rationale: '   ',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: 'cand_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when verdict is completely invalid', async () => {
      vi.spyOn(authModule, 'resolveAuthenticatedOfficer').mockResolvedValue(mockOfficer);
      vi.spyOn(db.overlapCandidate, 'findUnique').mockResolvedValue(sampleCandidate as any);

      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates/cand_test_001/review',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verdict: 'INVALID_VERDICT_XYZ',
            rationale: 'Some rationale here for review',
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ id: 'cand_test_001' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
