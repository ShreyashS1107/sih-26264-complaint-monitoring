import { z } from 'zod';

export const complaintCategoryEnum = z.enum([
  'FEE_ANOMALY',
  'INFRASTRUCTURE_DEFICIT',
  'FACULTY_NON_COMPLIANCE',
  'HARASSMENT_RAGGING',
  'ADMISSION_MALPRACTICE',
  'UNAPPROVED_PROGRAM',
  'OTHER',
]);

export const complaintPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const complaintStatusEnum = z.enum([
  'SUBMITTED',
  'UNDER_PRELIMINARY_REVIEW',
  'UNDER_INQUIRY',
  'COORDINATED_REVIEW',
  'RESOLVED',
  'CLOSED',
  'DISMISSED',
]);

export const complainantTypeEnum = z.enum(['STUDENT', 'FACULTY', 'PARENT', 'CITIZEN', 'ANONYMOUS']);

export const createComplaintSchema = z.object({
  complaintNumber: z
    .string()
    .regex(/^CMP-\d{4}-\d{4,6}$/, 'Expected format CMP-YYYY-XXXXX (e.g., CMP-2026-0001)'),
  originalBureauRef: z.string().min(1, 'Original bureau reference is required'),
  institutionId: z.string().min(1, 'Institution ID is required'),
  bureauId: z.string().min(1, 'Originating Bureau ID is required'),
  assignedOfficerId: z.string().optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: complaintCategoryEnum.default('OTHER'),
  priority: complaintPriorityEnum.default('MEDIUM'),
  status: complaintStatusEnum.default('SUBMITTED'),
  incidentDate: z.coerce.date().optional(),
  complainantType: complainantTypeEnum.default('STUDENT'),
  complainantMaskedId: z.string().optional(),
});

export const updateComplaintStatusSchema = z.object({
  complaintId: z.string().min(1),
  newStatus: complaintStatusEnum,
  notes: z.string().min(5, 'Audit note describing status transition is required'),
  officerId: z.string().min(1, 'Action must be attributed to an authorized officer'),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
