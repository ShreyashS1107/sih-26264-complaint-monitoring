import { z } from 'zod';

/**
 * AICTE Permanent Institute ID format validator
 * Typically '1-' followed by 7 to 12 digits (e.g., '1-12345678')
 */
export const aictePermanentIdSchema = z
  .string()
  .regex(
    /^1-\d{7,12}$/,
    'Invalid AICTE Permanent Institute ID format. Expected format: 1-XXXXXXXX'
  );

/**
 * Supported AICTE Bureaus and Special Cells
 */
export const CANONICAL_AICTE_BUREAUS = [
  'APPROVAL_BUREAU',
  'ANTI_RAGGING_CELL',
  'STUDENT_GRIEVANCE_CELL',
  'FACULTY_GRIEVANCE_CELL',
  'VIGILANCE_BUREAU',
  'REGIONAL_OFFICE',
] as const;

export const aicteBureauCodeSchema = z.enum(CANONICAL_AICTE_BUREAUS);

export const aicteBureauSchema = z.preprocess(
  (val) => (typeof val === 'string' ? val.toUpperCase() : val),
  aicteBureauCodeSchema
);

export type AicteBureau = z.infer<typeof aicteBureauCodeSchema>;

export const overlapReviewStatusSchema = z.enum([
  'PENDING_REVIEW',
  'FLAGGED_JOINT_REVIEW',
  'CONFIRMED_OVERLAP',
  'DISMISSED_INDEPENDENT',
]);

export type OverlapReviewStatus = z.infer<typeof overlapReviewStatusSchema>;

/**
 * Helper utility ensuring canonical pair ordering to prevent duplicate pairs in reverse order
 * and ensuring self-matches are detected.
 */
export function createCanonicalComplaintPair(
  complaintIdA: string,
  complaintIdB: string
): { primaryComplaintId: string; candidateComplaintId: string } {
  if (complaintIdA === complaintIdB) {
    throw new Error('Complaint pairs cannot create self-matches');
  }
  return complaintIdA < complaintIdB
    ? { primaryComplaintId: complaintIdA, candidateComplaintId: complaintIdB }
    : { primaryComplaintId: complaintIdB, candidateComplaintId: complaintIdA };
}

/**
 * Schema for Overlap Candidate Evaluation Record
 * Used by the overlap-detection engine to validate candidate detection inputs and scores.
 */
export const overlapCandidateSchema = z
  .object({
    primaryComplaintId: z.string().min(1, 'Primary complaint ID is required'),
    candidateComplaintId: z.string().min(1, 'Candidate complaint ID is required'),
    institutionId: aictePermanentIdSchema,
    similarityScore: z
      .number()
      .min(0, 'Similarity score must be >= 0.0')
      .max(1, 'Similarity score must be <= 1.0'),
    bureaus: z
      .array(aicteBureauSchema)
      .length(2, 'Overlap candidate must involve exactly two bureaus for cross-comparison'),
    status: z.enum(['pending_review', 'flagged_joint_review', 'dismissed', 'confirmed_overlap']),
  })
  .refine((data) => data.primaryComplaintId !== data.candidateComplaintId, {
    message: 'Complaint pairs cannot create self-matches',
    path: ['candidateComplaintId'],
  });

export type OverlapCandidate = z.infer<typeof overlapCandidateSchema>;

/**
 * Detailed database model schema for OverlapCandidate record
 */
export const overlapCandidateRecordSchema = z
  .object({
    id: z.string().optional(),
    primaryComplaintId: z.string().min(1),
    candidateComplaintId: z.string().min(1),
    institutionId: z.string().min(1),
    overallScore: z.number().min(0.0).max(1.0),
    entityScore: z.number().min(0.0).max(1.0),
    subjectScore: z.number().min(0.0).max(1.0),
    complainantScore: z.number().min(0.0).max(1.0),
    temporalScore: z.number().min(0.0).max(1.0),
    matchingSignals: z.object({
      commonKeywords: z.array(z.string()).default([]),
      daysApart: z.number().nonnegative().nullable(),
      involvedBureaus: z.array(aicteBureauSchema).default([]),
      explanation: z.string().min(5, 'Matching explanation must be provided'),
      entityMatchReason: z.string().optional(),
      temporalExplanation: z.string().optional(),
      recommendation: z.string().optional(),
      overlapType: z.string().optional(),
      severity: z.string().optional(),
    }),
    reviewStatus: overlapReviewStatusSchema.default('PENDING_REVIEW'),
    reviewNotes: z.string().optional(),
    reviewedById: z.string().optional(),
  })
  .refine((data) => data.primaryComplaintId !== data.candidateComplaintId, {
    message: 'Overlap candidate cannot pair a complaint with itself',
    path: ['candidateComplaintId'],
  });

export type OverlapCandidateRecord = z.infer<typeof overlapCandidateRecordSchema>;
