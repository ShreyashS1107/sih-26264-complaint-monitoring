import { z } from 'zod';

/**
 * AICTE Permanent Institute ID format validator
 * Typically '1-' followed by 8 to 12 digits (e.g., '1-12345678')
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
export const aicteBureauSchema = z.enum([
  'approval_bureau',
  'anti_ragging_cell',
  'student_grievance_cell',
  'faculty_grievance_cell',
  'vigilance_bureau',
  'regional_office',
]);

export type AicteBureau = z.infer<typeof aicteBureauSchema>;

/**
 * Schema for Overlap Candidate Evaluation Record
 * Used by the overlap-detection engine to validate candidate detection inputs and scores.
 */
export const overlapCandidateSchema = z.object({
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
});

export type OverlapCandidate = z.infer<typeof overlapCandidateSchema>;
