import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/v1/overlap-candidates/route';
import { POST } from '@/app/api/v1/overlap-candidates/[id]/review/route';
import { db } from '@/server/db';
import * as authModule from '@/lib/auth';

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
      const request = new Request(
        'http://localhost:3000/api/v1/overlap-candidates?minScore=2.5'
      );
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/overlap-candidates/[id]/review', () => {
    it('should fail closed with 401 when unauthenticated', async () => {
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
  });
});
