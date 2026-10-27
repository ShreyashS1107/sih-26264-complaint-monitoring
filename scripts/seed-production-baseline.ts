import { PrismaClient, OfficerRole, ComplaintPriority, ComplaintStatus, ComplaintCategory, ComplainantType, OverlapReviewStatus, ApprovalStatus } from '@prisma/client';

const prisma = new PrismaClient();

function getMaskedHost(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return 'DATABASE_URL not set in environment';
  try {
    const parsed = new URL(dbUrl);
    return `${parsed.protocol}//***:***@${parsed.host}${parsed.pathname}`;
  } catch {
    return 'custom connection string (masked)';
  }
}

// 1. Canonical Bureaus
const CANONICAL_BUREAUS = [
  {
    code: 'APPROVAL_BUREAU',
    name: 'Approval Bureau',
    description: 'Handles institutional approvals, extension of approval (EoA), and sanctioned intake compliances.',
  },
  {
    code: 'STUDENT_GRIEVANCE_CELL',
    name: 'Student Grievance Redressal Cell',
    description: 'Monitors student welfare, unapproved fee hikes, academic victimization, and mark sheet retention.',
  },
  {
    code: 'VIGILANCE_BUREAU',
    name: 'Vigilance Bureau',
    description: 'Investigates financial irregularities, false compliance affidavits, and administrative malpractices.',
  },
  {
    code: 'FACULTY_GRIEVANCE_CELL',
    name: 'Faculty & Staff Grievance Cell',
    description: 'Adjudicates non-payment of UGC/AICTE pay scales, arbitrary terminations, and service conditions.',
  },
  {
    code: 'ANTI_RAGGING_CELL',
    name: 'Anti-Ragging Monitoring Cell',
    description: 'Urgent tracking of ragging complaints and hostel safety compliance.',
  },
];

// 2. Canonical Demo Officers
const CANONICAL_OFFICERS = [
  {
    badgeNumber: 'OFF-AICTE-000',
    name: 'Dr. S. K. Rao (Central Admin)',
    email: 'dr.sk.rao@demo.aicte.internal',
    bureauCode: 'APPROVAL_BUREAU',
    role: OfficerRole.CENTRAL_ADMIN,
  },
  {
    badgeNumber: 'OFF-AICTE-001',
    name: 'Case Officer Alpha (Demo)',
    email: 'officer.alpha@demo.aicte.internal',
    bureauCode: 'APPROVAL_BUREAU',
    role: OfficerRole.CASE_OFFICER,
  },
  {
    badgeNumber: 'OFF-AICTE-002',
    name: 'Scrutinizer Beta (Demo)',
    email: 'officer.beta@demo.aicte.internal',
    bureauCode: 'STUDENT_GRIEVANCE_CELL',
    role: OfficerRole.SENIOR_SCRUTINIZER,
  },
  {
    badgeNumber: 'OFF-AICTE-003',
    name: 'Inspector Gamma (Demo)',
    email: 'officer.gamma@demo.aicte.internal',
    bureauCode: 'VIGILANCE_BUREAU',
    role: OfficerRole.BUREAU_HEAD,
  },
];

// 3. Canonical AICTE Institutions
const CANONICAL_INSTITUTIONS = [
  {
    permanentId: '1-10928374',
    name: 'Apex Institute of Advanced Technology',
    state: 'Maharashtra',
    district: 'Pune',
    address: 'Survey No. 42/1, IT Corridor, Hinjawadi Phase 2, Pune',
    pinCode: '411057',
    institutionType: 'Engineering & Technology',
    approvalStatus: ApprovalStatus.APPROVED,
  },
  {
    permanentId: '1-20948571',
    name: 'Delhi NCR Technical Institute',
    state: 'Delhi',
    district: 'New Delhi',
    address: 'Plot 15, Knowledge Boulevard, Jasola District Centre, New Delhi',
    pinCode: '110025',
    institutionType: 'Management & Technical',
    approvalStatus: ApprovalStatus.UNDER_SCRUTINY,
  },
  {
    permanentId: '1-30495821',
    name: 'Karnataka College of Engineering & Research',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    address: 'Post Bag 7605, Outer Ring Road, Bellandur, Bengaluru',
    pinCode: '560103',
    institutionType: 'Engineering & Technology',
    approvalStatus: ApprovalStatus.APPROVED,
  },
  {
    permanentId: '1-40918273',
    name: 'Tamil Nadu Institute of Polytechnic Studies',
    state: 'Tamil Nadu',
    district: 'Chennai',
    address: 'GST Road, Guindy Industrial Estate, Chennai',
    pinCode: '600032',
    institutionType: 'Polytechnic',
    approvalStatus: ApprovalStatus.APPROVED,
  },
  {
    permanentId: '1-50928374',
    name: 'Gujarat Regional Institute of Management & Science',
    state: 'Gujarat',
    district: 'Ahmedabad',
    address: 'SG Highway, Bodakdev, Ahmedabad',
    pinCode: '380054',
    institutionType: 'Management',
    approvalStatus: ApprovalStatus.APPROVED,
  },
];

// 4. Baseline Complaints
const BASELINE_COMPLAINTS = [
  {
    complaintNumber: 'AICTE-2026-8401',
    originalBureauRef: 'APP/2026/0881',
    institutionPermanentId: '1-10928374',
    bureauCode: 'APPROVAL_BUREAU',
    officerBadgeNumber: 'OFF-AICTE-001',
    subject: 'Excess student admissions exceeding approved intake in B.Tech CSE',
    description:
      'Audit report reveals institution admitted 240 students against sanctioned intake of 180 for academic year 2025-26 without AICTE Approval Bureau concurrence.',
    category: ComplaintCategory.UNAPPROVED_PROGRAM,
    priority: ComplaintPriority.HIGH,
    status: ComplaintStatus.UNDER_INQUIRY,
    complainantType: ComplainantType.CITIZEN,
    complainantMaskedId: 'CIT-***-4410',
  },
  {
    complaintNumber: 'AICTE-2026-8402',
    originalBureauRef: 'SGRC/2026/FEE-114',
    institutionPermanentId: '1-10928374',
    bureauCode: 'STUDENT_GRIEVANCE_CELL',
    officerBadgeNumber: 'OFF-AICTE-002',
    subject: 'Capitation fee demand and unapproved special lab infrastructure levy',
    description:
      'Students in computer science department coerced into paying mandatory ₹45,000 cash development fee with threat of examination hall ticket denial.',
    category: ComplaintCategory.FEE_ANOMALY,
    priority: ComplaintPriority.CRITICAL,
    status: ComplaintStatus.UNDER_INQUIRY,
    complainantType: ComplainantType.STUDENT,
    complainantMaskedId: 'STU-***-8821',
  },
  {
    complaintNumber: 'AICTE-2026-8403',
    originalBureauRef: 'APP/2026/PG-049',
    institutionPermanentId: '1-20948571',
    bureauCode: 'APPROVAL_BUREAU',
    officerBadgeNumber: 'OFF-AICTE-001',
    subject: 'Unapproved AI & Data Science postgraduate diploma course offering',
    description:
      'Institution actively marketing and enrolling students into a 2-year full-time diploma without obtaining prior Extension of Approval (EoA) from AICTE.',
    category: ComplaintCategory.UNAPPROVED_PROGRAM,
    priority: ComplaintPriority.HIGH,
    status: ComplaintStatus.UNDER_PRELIMINARY_REVIEW,
    complainantType: ComplainantType.CITIZEN,
    complainantMaskedId: 'CIT-***-9022',
  },
  {
    complaintNumber: 'AICTE-2026-8404',
    originalBureauRef: 'SGRC/2026/REF-308',
    institutionPermanentId: '1-20948571',
    bureauCode: 'STUDENT_GRIEVANCE_CELL',
    officerBadgeNumber: 'OFF-AICTE-002',
    subject: 'Refusal to refund full academic security deposit upon verified withdrawal',
    description:
      'Management refusing mandatory fee refunds to 12 students who withdrew prior to commencement cutoff date, citing internal forfeit clauses contrary to AICTE norms.',
    category: ComplaintCategory.FEE_ANOMALY,
    priority: ComplaintPriority.MEDIUM,
    status: ComplaintStatus.UNDER_INQUIRY,
    complainantType: ComplainantType.PARENT,
    complainantMaskedId: 'PAR-***-7120',
  },
  {
    complaintNumber: 'AICTE-2026-8405',
    originalBureauRef: 'ARC/2026/EMG-012',
    institutionPermanentId: '1-50928374',
    bureauCode: 'ANTI_RAGGING_CELL',
    officerBadgeNumber: 'OFF-AICTE-000',
    subject: 'Severe hostel ragging incident and administrative suppression',
    description:
      'First-year students subjected to physical hazing in hostel Wing C; local anti-ragging squad failed to file mandatory 24-hour compliance notification.',
    category: ComplaintCategory.HARASSMENT_RAGGING,
    priority: ComplaintPriority.CRITICAL,
    status: ComplaintStatus.UNDER_INQUIRY,
    complainantType: ComplainantType.STUDENT,
    complainantMaskedId: 'STU-***-3301',
  },
  {
    complaintNumber: 'AICTE-2026-8406',
    originalBureauRef: 'VIG/2026/AFF-077',
    institutionPermanentId: '1-50928374',
    bureauCode: 'VIGILANCE_BUREAU',
    officerBadgeNumber: 'OFF-AICTE-003',
    subject: 'Falsification of anti-ragging compliance committee and warden roster',
    description:
      'Vigilance inquiry reveals signatures on annual anti-ragging compliance affidavit were forged for faculty members no longer employed at the institution.',
    category: ComplaintCategory.OTHER,
    priority: ComplaintPriority.HIGH,
    status: ComplaintStatus.UNDER_PRELIMINARY_REVIEW,
    complainantType: ComplainantType.FACULTY,
    complainantMaskedId: 'FAC-***-1904',
  },
];

// 5. Initial Cross-Bureau Overlap Candidate Pairs
const BASELINE_OVERLAPS = [
  {
    primaryComplaintNumber: 'AICTE-2026-8401',
    candidateComplaintNumber: 'AICTE-2026-8402',
    overallScore: 0.88,
    entityScore: 1.0,
    subjectScore: 0.82,
    complainantScore: 0.65,
    temporalScore: 0.95,
    signals: {
      explanation: 'Both complaints target Apex Institute of Advanced Technology (1-10928374). Multiple shared indicators of intake inflation and unapproved fees.',
      commonKeywords: ['computer science', 'students', 'unapproved', 'admission'],
      dayDelta: 4,
    },
  },
  {
    primaryComplaintNumber: 'AICTE-2026-8403',
    candidateComplaintNumber: 'AICTE-2026-8404',
    overallScore: 0.82,
    entityScore: 1.0,
    subjectScore: 0.74,
    complainantScore: 0.60,
    temporalScore: 0.89,
    signals: {
      explanation: 'Both complaints target Delhi NCR Technical Institute (1-20948571). Linked to unapproved PG program enrollments and deposit withholdings.',
      commonKeywords: ['diploma', 'refund', 'admission', 'fee'],
      dayDelta: 7,
    },
  },
  {
    primaryComplaintNumber: 'AICTE-2026-8405',
    candidateComplaintNumber: 'AICTE-2026-8406',
    overallScore: 0.94,
    entityScore: 1.0,
    subjectScore: 0.92,
    complainantScore: 0.75,
    temporalScore: 0.98,
    signals: {
      explanation: 'Critical cross-bureau overlap between Anti-Ragging Cell and Vigilance Bureau on Gujarat Regional Institute (1-50928374).',
      commonKeywords: ['anti-ragging', 'hostel', 'compliance', 'affidavit', 'warden'],
      dayDelta: 2,
    },
  },
];

export async function seedProductionBaseline() {
  console.log('='.repeat(70));
  console.log('AICTE Portal - Safe Idempotent Baseline Seeding');
  console.log('='.repeat(70));
  console.log(`Target Database : ${getMaskedHost()}`);
  console.log('Mode            : Strictly Idempotent Upsert (update: {})');
  console.log('Safety Guarantee: Zero drops, zero truncations, zero deletions, zero duplicates');
  console.log('='.repeat(70));

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not defined.');
    process.exit(1);
  }

  // 1. Upsert Bureaus
  console.log('\n[1/5] Upserting 5 AICTE Bureaus...');
  const bureauMap = new Map<string, string>();
  for (const b of CANONICAL_BUREAUS) {
    const record = await prisma.bureau.upsert({
      where: { code: b.code },
      update: { name: b.name, description: b.description, isActive: true },
      create: { code: b.code, name: b.name, description: b.description, isActive: true },
    });
    bureauMap.set(b.code, record.id);
    console.log(`  ✓ Bureau: [${b.code}] ${b.name}`);
  }

  // 2. Upsert Demo Officers
  console.log('\n[2/5] Upserting 4 Demo Officers...');
  const officerMap = new Map<string, string>();
  for (const o of CANONICAL_OFFICERS) {
    const bureauId = bureauMap.get(o.bureauCode);
    if (!bureauId) throw new Error(`Bureau ${o.bureauCode} not found`);

    const record = await prisma.officer.upsert({
      where: { badgeNumber: o.badgeNumber },
      update: { name: o.name, email: o.email, bureauId, role: o.role, isActive: true },
      create: { badgeNumber: o.badgeNumber, name: o.name, email: o.email, bureauId, role: o.role, isActive: true },
    });
    officerMap.set(o.badgeNumber, record.id);
    console.log(`  ✓ Officer: [${o.badgeNumber}] ${o.name}`);
  }

  // 3. Upsert Institutions
  console.log('\n[3/5] Upserting 5 Canonical Institutions...');
  const instMap = new Map<string, string>();
  for (const inst of CANONICAL_INSTITUTIONS) {
    const record = await prisma.institution.upsert({
      where: { permanentId: inst.permanentId },
      update: {
        name: inst.name,
        state: inst.state,
        district: inst.district,
        address: inst.address,
        pinCode: inst.pinCode,
        institutionType: inst.institutionType,
        approvalStatus: inst.approvalStatus,
      },
      create: {
        permanentId: inst.permanentId,
        name: inst.name,
        state: inst.state,
        district: inst.district,
        address: inst.address,
        pinCode: inst.pinCode,
        institutionType: inst.institutionType,
        approvalStatus: inst.approvalStatus,
      },
    });
    instMap.set(inst.permanentId, record.id);
    console.log(`  ✓ Institution: [${inst.permanentId}] ${inst.name} (DB: ${record.id})`);
  }

  // 4. Upsert Baseline Complaints
  console.log('\n[4/5] Upserting 6 Baseline Complaints...');
  const complaintMap = new Map<string, { id: string; institutionId: string }>();
  for (const c of BASELINE_COMPLAINTS) {
    const institutionId = instMap.get(c.institutionPermanentId);
    if (!institutionId) throw new Error(`Institution ${c.institutionPermanentId} not found`);

    const bureauId = bureauMap.get(c.bureauCode);
    if (!bureauId) throw new Error(`Bureau ${c.bureauCode} not found`);

    const assignedOfficerId = officerMap.get(c.officerBadgeNumber) || null;

    const record = await prisma.complaint.upsert({
      where: { complaintNumber: c.complaintNumber },
      update: {}, // Preserve any status updates if complaint already exists!
      create: {
        complaintNumber: c.complaintNumber,
        originalBureauRef: c.originalBureauRef,
        institutionId,
        bureauId,
        assignedOfficerId,
        subject: c.subject,
        description: c.description,
        category: c.category,
        priority: c.priority,
        status: c.status,
        complainantType: c.complainantType,
        complainantMaskedId: c.complainantMaskedId,
      },
    });
    complaintMap.set(c.complaintNumber, { id: record.id, institutionId: record.institutionId });
    console.log(`  ✓ Complaint: [${c.complaintNumber}] (${c.status}) ${c.subject.slice(0, 45)}...`);
  }

  // 5. Upsert Overlap Candidates
  console.log('\n[5/5] Upserting 3 Cross-Bureau Overlap Candidate Pairs...');
  for (const ovl of BASELINE_OVERLAPS) {
    const primary = complaintMap.get(ovl.primaryComplaintNumber);
    const candidate = complaintMap.get(ovl.candidateComplaintNumber);
    if (!primary || !candidate) {
      throw new Error(`Complaints for overlap pair ${ovl.primaryComplaintNumber} ↔ ${ovl.candidateComplaintNumber} not resolved`);
    }

    const record = await prisma.overlapCandidate.upsert({
      where: {
        primaryComplaintId_candidateComplaintId: {
          primaryComplaintId: primary.id,
          candidateComplaintId: candidate.id,
        },
      },
      update: {}, // Preserve existing review decisions if already reviewed!
      create: {
        primaryComplaintId: primary.id,
        candidateComplaintId: candidate.id,
        institutionId: primary.institutionId,
        overallScore: ovl.overallScore,
        entityScore: ovl.entityScore,
        subjectScore: ovl.subjectScore,
        complainantScore: ovl.complainantScore,
        temporalScore: ovl.temporalScore,
        matchingSignals: ovl.signals,
        reviewStatus: OverlapReviewStatus.PENDING_REVIEW,
      },
    });
    console.log(
      `  ✓ OverlapCandidate: [${ovl.primaryComplaintNumber} ↔ ${ovl.candidateComplaintNumber}] Score: ${Math.round(
        ovl.overallScore * 100
      )}% | Status: ${record.reviewStatus} (DB ID: ${record.id})`
    );
  }

  console.log('\n' + '='.repeat(70));
  console.log('✓ Successfully executed baseline seed.');
  console.log('All 5 institutions, 6 complaints, and 3 overlap pairs are ready.');
  console.log('Zero records were deleted or overwritten.');
  console.log('='.repeat(70));
}

// Execute when invoked directly
if (require.main === module || process.argv[1]?.includes('seed-production-baseline')) {
  seedProductionBaseline()
    .catch((err: unknown) => {
      console.error('\nBaseline seeding failed:');
      if (err instanceof Error) {
        const safeMsg = err.message.replace(/postgres(ql)?:\/\/[^\s]+/gi, '[DATABASE_URL_REDACTED]');
        console.error(safeMsg);
      } else {
        console.error(String(err));
      }
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
