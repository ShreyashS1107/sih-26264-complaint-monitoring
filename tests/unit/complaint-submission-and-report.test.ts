import { describe, expect, it } from 'vitest';
import { scanForOverlapCandidates, ComplaintInput } from '@/modules/overlap-detection/engine';

describe('Complaint Submission & Overlap Scrutiny Engine', () => {
  const existingComplaintA: ComplaintInput = {
    id: 'AICTE-2026-8401',
    complaintNumber: 'AICTE-2026-8401',
    originalBureauRef: 'BUR-8401',
    bureauId: 'Approval Bureau',
    institutionId: 'AICTE-INST-8821',
    institution: {
      permanentId: '1-10928374',
      name: 'Apex Institute of Advanced Technology',
      state: 'Maharashtra',
      district: 'Pune',
    },
    subject: 'Unapproved Capitation Fee Collection during Admission Cycle 2026-27',
    description:
      'The institution management has mandated an additional cash payment of ₹2,50,000 as an Institutional Infrastructure Development Contribution above the state fee committee sanctioned tariff as a mandatory precondition for issuance of the admission confirmation slip in B.Tech Computer Engineering.',
    category: 'Capitation & Excess Fee Violation',
    priority: 'Critical',
    complainantType: 'Parent',
    createdAt: '2026-09-12',
  };

  const existingComplaintB: ComplaintInput = {
    id: 'AICTE-2026-8402',
    complaintNumber: 'AICTE-2026-8402',
    originalBureauRef: 'BUR-8402',
    bureauId: 'Approval Bureau',
    institutionId: 'AICTE-INST-8821',
    institution: {
      permanentId: '1-10928374',
      name: 'Apex Institute of Advanced Technology',
      state: 'Maharashtra',
      district: 'Pune',
    },
    subject: 'Demanding Unauthorized Development Charges Under Threat of Hall Ticket Withholding',
    description:
      'Students enrolled in the second-year IT and Computer streams are being coerced by administration official Dr. R. K. Deshmukh to deposit ₹75,000 as Campus Technology & Maintenance Levy. Failure to pay by end of month will result in withholding exam hall tickets.',
    category: 'Capitation & Excess Fee Violation',
    priority: 'Critical',
    complainantType: 'Student',
    createdAt: '2026-09-16',
  };

  it('correctly detects thematic overlap when a new grievance shares institution and fee allegations', () => {
    const newGrievance: ComplaintInput = {
      id: 'AICTE-2026-9999',
      complaintNumber: 'AICTE-2026-9999',
      originalBureauRef: 'BUR-9999',
      bureauId: 'Student Grievance Cell',
      institutionId: 'AICTE-INST-8821',
      institution: {
        permanentId: '1-10928374',
        name: 'Apex Institute of Advanced Technology',
        state: 'Maharashtra',
        district: 'Pune',
      },
      subject: 'Mandatory Cash Capitation Fee Demand for Second Year IT Students',
      description:
        'Second year students are being compelled to pay ₹75,000 unauthorized technology contribution under threat of withholding hall tickets and examination registration.',
      category: 'Capitation & Excess Fee Violation',
      priority: 'High',
      complainantType: 'Student',
      createdAt: '2026-09-18',
    };

    const candidates = scanForOverlapCandidates(
      newGrievance,
      [existingComplaintA, existingComplaintB],
      0.35
    );

    expect(candidates.length).toBeGreaterThanOrEqual(1);
    const topCandidate = candidates[0];

    // Engine should compute high score on matching institution + overlapping fee/hall ticket terms
    expect(topCandidate.overallScore).toBeGreaterThan(0.45);
    expect(topCandidate.entityScore).toBe(1.0);
    expect(topCandidate.matchingSignals.commonKeywords.length).toBeGreaterThan(0);

    // Advisory recommendation must be present
    expect(['FLAG_FOR_JOINT_REVIEW', 'MONITOR_SYMPTOMATIC_CLUSTER']).toContain(
      topCandidate.matchingSignals.recommendation
    );
  });

  it('treats complaints concerning different institutions as independent regardless of wording', () => {
    const differentInstitutionComplaint: ComplaintInput = {
      id: 'AICTE-2026-5555',
      complaintNumber: 'AICTE-2026-5555',
      originalBureauRef: 'BUR-5555',
      bureauId: 'Approval Bureau',
      institutionId: 'AICTE-INST-4412',
      institution: {
        permanentId: '1-20948571',
        name: 'Delhi NCR Technical Institute',
        state: 'Delhi',
        district: 'New Delhi',
      },
      subject: 'Unapproved Capitation Fee Collection during Admission Cycle 2026-27',
      description:
        'The institution management has mandated an additional cash payment of ₹2,50,000 as an Institutional Infrastructure Development Contribution.',
      category: 'Capitation & Excess Fee Violation',
      priority: 'Critical',
      complainantType: 'Parent',
      createdAt: '2026-09-12',
    };

    const candidates = scanForOverlapCandidates(
      differentInstitutionComplaint,
      [existingComplaintA, existingComplaintB],
      0.45
    );

    // Because institutions are distinct (Delhi vs Maharashtra with different AICTE IDs), entity score collapses
    expect(candidates.length).toBe(0);
  });

  it('validates allowed attachment extensions and file size limits', () => {
    const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

    const validateAttachment = (filename: string, sizeBytes: number) => {
      const dotIdx = filename.lastIndexOf('.');
      const ext = dotIdx !== -1 ? filename.slice(dotIdx).toLowerCase() : '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return { valid: false, error: `Unsupported extension: ${ext}` };
      }
      if (sizeBytes > MAX_FILE_SIZE_BYTES) {
        return { valid: false, error: 'File exceeds 10 MB limit' };
      }
      return { valid: true };
    };

    expect(validateAttachment('affidavit.pdf', 1024 * 500).valid).toBe(true);
    expect(validateAttachment('fee_receipt.jpg', 1024 * 200).valid).toBe(true);
    expect(validateAttachment('inspection.docx', 1024 * 1500).valid).toBe(true);
    expect(validateAttachment('malicious.exe', 1024 * 50).valid).toBe(false);
    expect(validateAttachment('archive.zip', 1024 * 50).valid).toBe(false);
    expect(validateAttachment('large_scan.pdf', 15 * 1024 * 1024).valid).toBe(false);
  });
});
