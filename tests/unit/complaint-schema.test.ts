import { describe, expect, it } from 'vitest';
import { createComplaintSchema, updateComplaintStatusSchema } from '@/modules/complaints/schema';

describe('Complaint Domain Validation & Business Rules', () => {
  const validComplaint = {
    complaintNumber: 'CMP-2026-0001',
    originalBureauRef: 'APP/2026/G-881',
    institutionId: 'inst_matrix_01',
    bureauId: 'bureau_approval',
    subject: 'Discrepancy in sanctioned student intake for CS program',
    description: 'Admitted 180 students against sanctioned intake quota of 120.',
    category: 'UNAPPROVED_PROGRAM' as const,
    priority: 'HIGH' as const,
    status: 'SUBMITTED' as const,
    complainantType: 'CITIZEN' as const,
    complainantMaskedId: 'CIT-***-4410',
  };

  it('should accept a correctly structured complaint payload', () => {
    const result = createComplaintSchema.safeParse(validComplaint);
    expect(result.success).toBe(true);
  });

  it('should reject malformed complaint tracking numbers', () => {
    const invalidNumbers = ['CMP20260001', 'CMP-26-1', 'INVALID-NUMBER'];
    for (const num of invalidNumbers) {
      const result = createComplaintSchema.safeParse({
        ...validComplaint,
        complaintNumber: num,
      });
      expect(result.success).toBe(false);
    }
  });

  it('should allow multiple independent complaints for the same institutionId', () => {
    const complaintA = {
      ...validComplaint,
      complaintNumber: 'CMP-2026-0001',
      originalBureauRef: 'APP/2026/G-881',
      bureauId: 'bureau_approval',
      subject: 'Intake discrepancy',
      category: 'UNAPPROVED_PROGRAM' as const,
    };

    const complaintB = {
      ...validComplaint,
      complaintNumber: 'CMP-2026-0002',
      originalBureauRef: 'SGRC/2026/FEE-114',
      bureauId: 'bureau_student_grievance',
      subject: 'Exorbitant development fee',
      category: 'FEE_ANOMALY' as const,
    };

    const parsedA = createComplaintSchema.safeParse(complaintA);
    const parsedB = createComplaintSchema.safeParse(complaintB);

    expect(parsedA.success).toBe(true);
    expect(parsedB.success).toBe(true);
    expect(complaintA.institutionId).toBe(complaintB.institutionId);
    expect(complaintA.complaintNumber).not.toBe(complaintB.complaintNumber);
    expect(complaintA.bureauId).not.toBe(complaintB.bureauId);
  });

  it('should require an audit note when changing complaint status', () => {
    const validTransition = {
      complaintId: 'cmp_123',
      newStatus: 'UNDER_INQUIRY' as const,
      notes: 'Assigned to preliminary inspection panel.',
      officerId: 'off_001',
    };

    const withoutNotes = {
      complaintId: 'cmp_123',
      newStatus: 'UNDER_INQUIRY' as const,
      notes: '',
      officerId: 'off_001',
    };

    expect(updateComplaintStatusSchema.safeParse(validTransition).success).toBe(true);
    expect(updateComplaintStatusSchema.safeParse(withoutNotes).success).toBe(false);
  });
});
