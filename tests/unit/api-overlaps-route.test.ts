import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/v1/complaints/[id]/overlaps/route';
import { db } from '@/server/db';
import * as overlapModule from '@/modules/overlap-detection';

describe('GET /api/v1/complaints/[id]/overlaps Route Handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 400 when complaint ID parameter is empty, whitespace, or invalid', async () => {
    const invalidIds = ['', '   ', 'undefined', 'null'];

    for (const id of invalidIds) {
      const request = new Request(`http://localhost:3000/api/v1/complaints/${id}/overlaps`);
      const response = await GET(request, { params: Promise.resolve({ id }) });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.data).toBeNull();
      expect(body.error.code).toBe('INVALID_COMPLAINT_ID');
      expect(body.meta.requestId).toBeDefined();
      expect(body.meta.timestamp).toBeDefined();
    }
  });

  it('should return 404 when complaint does not exist in the database', async () => {
    vi.spyOn(db.complaint, 'findUnique').mockResolvedValue(null);

    const request = new Request(
      'http://localhost:3000/api/v1/complaints/cmp_nonexistent/overlaps'
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: 'cmp_nonexistent' }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('COMPLAINT_NOT_FOUND');
    expect(body.error.message).toContain('cmp_nonexistent');
    expect(body.meta.requestId).toBeDefined();
  });

  it('should return 200 with candidates for a valid complaint', async () => {
    vi.spyOn(db.complaint, 'findUnique').mockResolvedValue({
      id: 'cmp_valid_01',
      complaintNumber: 'CMP-2026-0001',
    } as any);

    const mockCandidates = [
      {
        id: 'overlap_cand_01',
        primaryComplaintId: 'cmp_valid_01',
        candidateComplaintId: 'cmp_other_02',
        overallScore: 0.88,
        entityScore: 1.0,
        subjectScore: 0.85,
        temporalScore: 0.95,
        complainantScore: 0.6,
        reviewStatus: 'FLAGGED_JOINT_REVIEW',
        matchingSignals: {
          commonKeywords: ['unapproved fee', 'hall ticket'],
          explanation: 'Direct duplicate filing detected.',
          recommendation: 'FLAG_FOR_JOINT_REVIEW',
          overlapType: 'DIRECT_DUPLICATE',
          severity: 'HIGH',
        },
      },
    ];

    vi.spyOn(overlapModule, 'getOverlapCandidatesForComplaint').mockResolvedValue(
      mockCandidates as any
    );

    const request = new Request(
      'http://localhost:3000/api/v1/complaints/cmp_valid_01/overlaps'
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: 'cmp_valid_01' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe('overlap_cand_01');
    expect(body.data[0].overallScore).toBe(0.88);
    expect(body.meta.requestId).toBeDefined();
  });

  it('should sort candidates by overallScore descending with deterministic tie-breaking on id', async () => {
    vi.spyOn(db.complaint, 'findUnique').mockResolvedValue({
      id: 'cmp_valid_02',
      complaintNumber: 'CMP-2026-0002',
    } as any);

    const unsortedCandidates = [
      { id: 'cand_beta', overallScore: 0.75 },
      { id: 'cand_delta', overallScore: 0.75 }, // Same score as beta, but 'cand_delta' > 'cand_beta'
      { id: 'cand_alpha', overallScore: 0.95 }, // Highest score
      { id: 'cand_gamma', overallScore: 0.5 }, // Lowest score
    ];

    vi.spyOn(overlapModule, 'getOverlapCandidatesForComplaint').mockResolvedValue(
      unsortedCandidates as any
    );

    const request = new Request(
      'http://localhost:3000/api/v1/complaints/cmp_valid_02/overlaps'
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: 'cmp_valid_02' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    const sortedIds = body.data.map((c: { id: string }) => c.id);
    // Expected order:
    // 1. cand_alpha (0.95)
    // 2. cand_beta (0.75, 'cand_beta' < 'cand_delta')
    // 3. cand_delta (0.75)
    // 4. cand_gamma (0.50)
    expect(sortedIds).toEqual(['cand_alpha', 'cand_beta', 'cand_delta', 'cand_gamma']);
  });

  it('should produce a safe 500 error envelope without leaking sensitive database errors', async () => {
    vi.spyOn(db.complaint, 'findUnique').mockRejectedValue(
      new Error(
        'FATAL: password authentication failed for user "postgres" at postgresql://postgres:secret_pass@internal-cluster:5432'
      )
    );

    const request = new Request(
      'http://localhost:3000/api/v1/complaints/cmp_valid_03/overlaps'
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: 'cmp_valid_03' }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.message).toBe(
      'An unexpected error occurred while retrieving overlap candidates.'
    );
    // Ensure sensitive internal database connection strings are never leaked
    expect(JSON.stringify(body)).not.toContain('secret_pass');
    expect(JSON.stringify(body)).not.toContain('internal-cluster');
    expect(body.meta.requestId).toBeDefined();
  });
});
