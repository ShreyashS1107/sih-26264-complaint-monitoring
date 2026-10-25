import { describe, expect, it } from 'vitest';
import {
  aictePermanentIdSchema,
  createCanonicalComplaintPair,
  overlapCandidateRecordSchema,
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

const validCandidate: OverlapCandidate = {
  primaryComplaintId: 'CMP-2026-001',
  candidateComplaintId: 'CMP-2026-042',
  institutionId: '1-12345678',
  similarityScore: 0.87,
  bureaus: ['APPROVAL_BUREAU', 'VIGILANCE_BUREAU'],
  status: 'pending_review',
};

describe('Overlap Detection Candidate Schema & Integrity Rules', () => {
  it('should validate a correctly structured overlap candidate', () => {
    const result = overlapCandidateSchema.safeParse(validCandidate);
    expect(result.success).toBe(true);
  });

  it('should strictly reject self-matches (same primary and candidate complaint ID)', () => {
    const selfMatch = {
      ...validCandidate,
      primaryComplaintId: 'CMP-2026-001',
      candidateComplaintId: 'CMP-2026-001',
    };
    const result = overlapCandidateSchema.safeParse(selfMatch);
    expect(result.success).toBe(false);
  });

  it('should reject similarity scores outside [0.0, 1.0]', () => {
    const overScore = { ...validCandidate, similarityScore: 1.15 };
    const underScore = { ...validCandidate, similarityScore: -0.2 };

    expect(overlapCandidateSchema.safeParse(overScore).success).toBe(false);
    expect(overlapCandidateSchema.safeParse(underScore).success).toBe(false);
  });

  it('should reject candidates with invalid bureau count or invalid bureau name', () => {
    const singleBureau = {
      ...validCandidate,
      bureaus: ['APPROVAL_BUREAU'] as any,
    };
    const invalidBureau = {
      ...validCandidate,
      bureaus: ['APPROVAL_BUREAU', 'unsupported_cell'] as any,
    };

    expect(overlapCandidateSchema.safeParse(singleBureau).success).toBe(false);
    expect(overlapCandidateSchema.safeParse(invalidBureau).success).toBe(false);
  });
});

describe('Canonical Complaint Pair Ordering Utility', () => {
  it('should order complaint pairs consistently regardless of argument order', () => {
    const pair1 = createCanonicalComplaintPair('CMP-002', 'CMP-001');
    const pair2 = createCanonicalComplaintPair('CMP-001', 'CMP-002');

    expect(pair1.primaryComplaintId).toBe('CMP-001');
    expect(pair1.candidateComplaintId).toBe('CMP-002');
    expect(pair1).toEqual(pair2);
  });

  it('should throw an error when attempting to pair a complaint with itself', () => {
    expect(() => createCanonicalComplaintPair('CMP-001', 'CMP-001')).toThrow(
      'Complaint pairs cannot create self-matches'
    );
  });
});

describe('Detailed Overlap Candidate Database Record Validation', () => {
  const validRecord = {
    primaryComplaintId: 'cmp_alpha',
    candidateComplaintId: 'cmp_beta',
    institutionId: 'inst_matrix',
    overallScore: 0.85,
    entityScore: 1.0,
    subjectScore: 0.82,
    complainantScore: 0.6,
    temporalScore: 0.95,
    matchingSignals: {
      commonKeywords: ['unapproved fee', 'refund'],
      daysApart: 8,
      involvedBureaus: ['STUDENT_GRIEVANCE_CELL', 'VIGILANCE_BUREAU'],
      explanation: 'Both complaints report unauthorized fee levies within 8 days.',
    },
    reviewStatus: 'PENDING_REVIEW' as const,
  };

  it('should validate a complete explainable candidate record', () => {
    const result = overlapCandidateRecordSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });

  it('should validate candidate record with null daysApart when dates are unverified', () => {
    const recordWithNullDays = {
      ...validRecord,
      matchingSignals: {
        ...validRecord.matchingSignals,
        daysApart: null,
        explanation: 'Both complaints report unauthorized fee levies with unverified dates.',
      },
    };
    const result = overlapCandidateRecordSchema.safeParse(recordWithNullDays);
    expect(result.success).toBe(true);
  });

  it('should validate canonical uppercase bureau codes and transform lowercase codes', () => {
    const uppercaseCandidate = {
      ...validCandidate,
      bureaus: ['APPROVAL_BUREAU', 'VIGILANCE_BUREAU'],
    };
    const result = overlapCandidateSchema.safeParse(uppercaseCandidate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bureaus).toEqual(['APPROVAL_BUREAU', 'VIGILANCE_BUREAU']);
    }

    const lowercaseCandidate = {
      ...validCandidate,
      bureaus: ['approval_bureau', 'vigilance_bureau'],
    };
    const resultLower = overlapCandidateSchema.safeParse(lowercaseCandidate);
    expect(resultLower.success).toBe(true);
    if (resultLower.success) {
      expect(resultLower.data.bureaus).toEqual(['APPROVAL_BUREAU', 'VIGILANCE_BUREAU']);
    }
  });

  it('should reject candidate record when explanation is missing or too short', () => {
    const invalidSignals = {
      ...validRecord,
      matchingSignals: {
        ...validRecord.matchingSignals,
        explanation: 'Bad',
      },
    };
    const result = overlapCandidateRecordSchema.safeParse(invalidSignals);
    expect(result.success).toBe(false);
  });
});
