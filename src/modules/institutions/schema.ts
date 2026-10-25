import { z } from 'zod';
import { aictePermanentIdSchema } from '@/modules/overlap-detection/schema';

export const approvalStatusEnum = z.enum([
  'APPROVED',
  'UNDER_SCRUTINY',
  'PROVISIONAL',
  'WITHDRAWN',
]);

export const institutionTypeEnum = z.enum([
  'ENGINEERING_TECHNOLOGY',
  'MANAGEMENT',
  'PHARMACY',
  'POLYTECHNIC',
  'ARCHITECTURE_PLANNING',
  'APPLIED_ARTS_CRAFTS',
  'HOTEL_MANAGEMENT',
]);

export const createInstitutionSchema = z.object({
  permanentId: aictePermanentIdSchema,
  name: z.string().min(3, 'Institution name must be at least 3 characters').max(200),
  state: z.string().min(2, 'State name is required'),
  district: z.string().min(2, 'District name is required'),
  address: z.string().optional(),
  pinCode: z
    .string()
    .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits')
    .optional(),
  institutionType: institutionTypeEnum,
  approvalStatus: approvalStatusEnum.default('APPROVED'),
});

export type CreateInstitutionInput = z.infer<typeof createInstitutionSchema>;
