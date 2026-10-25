import { describe, expect, it } from 'vitest';
import {
  aictePermanentIdSchema,
  overlapCandidateSchema,
  type OverlapCandidate,
} from '@/modules/overlap-detection/schema';

describe('AICTE Permanent Institute ID Validation', () => {
  it('should accept valid AICTE permanent IDs', () => {
    const validIds = ['1-12345678', '1-987654321', '1-1002003004'];
    for (const id of validIds) {
      expect(aictePermanentIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it('should reject invalid formats for AICTE permanent IDs', () => {
    const invalidIds = ['2-12345678', '12345678', '1-abcde', 'INVALID-ID', ''];
    for (const id of invalidIds) {
      expect(aictePermanentIdSchema.safeParse(id).success).toBe(false);
    }
  });
});

describe('Overlap Detection Candidate Schema', () => {
  const validCandidate: OverlapCandidate = {
    primaryComplaintId: 'CMP-2026-001',
    candidateComplaintId: 'CMP-2026-042',
    institutionId: '1-12345678',
    similarityScore: 0.87,
    bureaus: ['approval_bureau', 'vigilance_bureau'],
    status: 'pending_review',
  };

  it('should validate a correctly structured overlap candidate', () => {
    const result = overlapCandidateSchema.safeParse(validCandidate);
    expect(result.success).toBe(true);
  });

  it('should reject similarity scores greater than 1.0 or less than 0.0', () => {
    const overScore = { ...validCandidate, similarityScore: 1.15 };
    const underScore = { ...validCandidate, similarityScore: -0.2 };

    expect(overlapCandidateSchema.safeParse(overScore).success).toBe(false);
    expect(overlapCandidateSchema.safeParse(underScore).success).toBe(false);
  });

  it('should reject candidates with invalid bureau count or invalid bureau name', () => {
    const singleBureau = {
      ...validCandidate,
      bureaus: ['approval_bureau'],
    };
    const invalidBureau = {
      ...validCandidate,
      bureaus: ['approval_bureau', 'unsupported_cell'],
    };

    expect(overlapCandidateSchema.safeParse(singleBureau).success).toBe(false);
    expect(overlapCandidateSchema.safeParse(invalidBureau).success).toBe(false);
  });
});
