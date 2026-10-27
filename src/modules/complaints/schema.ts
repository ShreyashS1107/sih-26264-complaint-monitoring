import { z } from 'zod';

export const complaintCategoryEnum = z.preprocess(
  (val) => (typeof val === 'string' ? val.toUpperCase() : val),
  z.enum([
    'FEE_ANOMALY',
    'INFRASTRUCTURE_DEFICIT',
    'FACULTY_NON_COMPLIANCE',
    'HARASSMENT_RAGGING',
    'ADMISSION_MALPRACTICE',
    'UNAPPROVED_PROGRAM',
    'OTHER',
  ])
);

export const complaintPriorityEnum = z.preprocess(
  (val) => (typeof val === 'string' ? val.toUpperCase() : val),
  z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
);

export const complaintStatusEnum = z.preprocess(
  (val) => (typeof val === 'string' ? val.toUpperCase() : val),
  z.enum([
    'SUBMITTED',
    'UNDER_PRELIMINARY_REVIEW',
    'UNDER_INQUIRY',
    'COORDINATED_REVIEW',
    'RESOLVED',
    'CLOSED',
    'DISMISSED',
  ])
);

export const complainantTypeEnum = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const upper = val.toUpperCase();
      if (upper === 'WHISTLEBLOWER') return 'CITIZEN';
      return upper;
    }
    return val;
  },
  z.enum(['STUDENT', 'FACULTY', 'PARENT', 'CITIZEN', 'ANONYMOUS'])
);

export const evidenceDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  fileSize: z.string(),
  uploadDate: z.string(),
  category: z.string(),
});

export const complaintIncidentDateSchema = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.coerce.date().optional()
);

export const createComplaintSchema = z.object({
  complaintNumber: z
    .string()
    .regex(/^CMP-\d{4}-\d{4,6}$/, 'Expected format CMP-YYYY-XXXXX (e.g., CMP-2026-0001)'),
  originalBureauRef: z.string().min(1, 'Original bureau reference is required'),
  institutionId: z.string().min(1, 'Institution ID is required'),
  permanentId: z.string().nullish().transform((v) => v || undefined),
  institutionName: z.string().nullish().transform((v) => v || undefined),
  state: z.string().nullish().transform((v) => v || undefined),
  district: z.string().nullish().transform((v) => v || undefined),
  bureauId: z.string().min(1, 'Originating Bureau ID is required'),
  assignedOfficerId: z.string().nullish().transform((v) => v || undefined),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: complaintCategoryEnum.default('OTHER'),
  priority: complaintPriorityEnum.default('MEDIUM'),
  status: complaintStatusEnum.default('SUBMITTED'),
  incidentDate: complaintIncidentDateSchema,
  complainantType: complainantTypeEnum.default('STUDENT'),
  complainantMaskedId: z.string().nullish().transform((v) => v || undefined),
  allegations: z.array(z.string()).optional().default([]),
  evidence: z.array(evidenceDocumentSchema).optional().default([]),
});

export const updateComplaintStatusSchema = z.object({
  complaintId: z.string().min(1),
  newStatus: complaintStatusEnum,
  notes: z.string().min(5, 'Audit note describing status transition is required'),
  officerId: z.string().min(1, 'Action must be attributed to an authorized officer'),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
