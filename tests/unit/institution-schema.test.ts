import { describe, expect, it } from 'vitest';
import { createInstitutionSchema } from '@/modules/institutions/schema';

describe('Institution Domain Validation', () => {
  const validInstitution = {
    permanentId: '1-10098765',
    name: 'Matrix Institute of Advanced Technology (Synthetic Sample)',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    address: 'Plot 42, Tech Corridor, Electronic City',
    pinCode: '560100',
    institutionType: 'ENGINEERING_TECHNOLOGY' as const,
    approvalStatus: 'APPROVED' as const,
  };

  it('should accept a valid institution profile', () => {
    const result = createInstitutionSchema.safeParse(validInstitution);
    expect(result.success).toBe(true);
  });

  it('should reject invalid AICTE Permanent ID format', () => {
    const invalid = { ...validInstitution, permanentId: '99-INVALID' };
    const result = createInstitutionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject invalid PIN codes', () => {
    const shortPin = { ...validInstitution, pinCode: '5601' };
    const alphaPin = { ...validInstitution, pinCode: '56010A' };
    expect(createInstitutionSchema.safeParse(shortPin).success).toBe(false);
    expect(createInstitutionSchema.safeParse(alphaPin).success).toBe(false);
  });

  it('should reject invalid institution types', () => {
    const invalidType = { ...validInstitution, institutionType: 'UNKNOWN_DISCIPLINE' };
    const result = createInstitutionSchema.safeParse(invalidType);
    expect(result.success).toBe(false);
  });
});
