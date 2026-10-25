import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SIH 26264 database with synthetic demo data...');

  // 1. Seed AICTE Bureaus
  const approvalBureau = await prisma.bureau.upsert({
    where: { code: 'APPROVAL_BUREAU' },
    update: {},
    create: {
      code: 'APPROVAL_BUREAU',
      name: 'Approval Bureau',
      description:
        'Handles institutional approvals, extension of approval (EoA), and sanctioned intake compliances.',
      isActive: true,
    },
  });

  const studentGrievance = await prisma.bureau.upsert({
    where: { code: 'STUDENT_GRIEVANCE_CELL' },
    update: {},
    create: {
      code: 'STUDENT_GRIEVANCE_CELL',
      name: 'Student Grievance Redressal Cell',
      description:
        'Monitors student welfare, unapproved fee hikes, academic victimization, and mark sheet retention.',
      isActive: true,
    },
  });

  const vigilanceBureau = await prisma.bureau.upsert({
    where: { code: 'VIGILANCE_BUREAU' },
    update: {},
    create: {
      code: 'VIGILANCE_BUREAU',
      name: 'Vigilance Bureau',
      description:
        'Investigates financial irregularities, false compliance affidavits, and administrative malpractices.',
      isActive: true,
    },
  });

  const facultyCell = await prisma.bureau.upsert({
    where: { code: 'FACULTY_GRIEVANCE_CELL' },
    update: {},
    create: {
      code: 'FACULTY_GRIEVANCE_CELL',
      name: 'Faculty & Staff Grievance Cell',
      description:
        'Adjudicates non-payment of UGC/AICTE pay scales, arbitrary terminations, and service conditions.',
      isActive: true,
    },
  });

  const antiRagging = await prisma.bureau.upsert({
    where: { code: 'ANTI_RAGGING_CELL' },
    update: {},
    create: {
      code: 'ANTI_RAGGING_CELL',
      name: 'Anti-Ragging Monitoring Cell',
      description: 'Urgent tracking of ragging complaints and hostel safety compliance.',
      isActive: true,
    },
  });

  // 2. Seed Officers (Strictly synthetic demonstration data)
  const _officerAdmin = await prisma.officer.upsert({
    where: { badgeNumber: 'OFF-AICTE-000' },
    update: {},
    create: {
      badgeNumber: 'OFF-AICTE-000',
      name: 'Dr. S. K. Rao (Central Admin)',
      email: 'dr.sk.rao@demo.aicte.internal',
      bureauId: approvalBureau.id,
      role: 'CENTRAL_ADMIN',
      isActive: true,
    },
  });

  const officerAlpha = await prisma.officer.upsert({
    where: { badgeNumber: 'OFF-AICTE-001' },
    update: {},
    create: {
      badgeNumber: 'OFF-AICTE-001',
      name: 'Case Officer Alpha (Demo)',
      email: 'officer.alpha@demo.aicte.internal',
      bureauId: approvalBureau.id,
      role: 'CASE_OFFICER',
      isActive: true,
    },
  });

  const officerBeta = await prisma.officer.upsert({
    where: { badgeNumber: 'OFF-AICTE-002' },
    update: {},
    create: {
      badgeNumber: 'OFF-AICTE-002',
      name: 'Scrutinizer Beta (Demo)',
      email: 'officer.beta@demo.aicte.internal',
      bureauId: studentGrievance.id,
      role: 'SENIOR_SCRUTINIZER',
      isActive: true,
    },
  });

  const officerGamma = await prisma.officer.upsert({
    where: { badgeNumber: 'OFF-AICTE-003' },
    update: {},
    create: {
      badgeNumber: 'OFF-AICTE-003',
      name: 'Inspector Gamma (Demo)',
      email: 'officer.gamma@demo.aicte.internal',
      bureauId: vigilanceBureau.id,
      role: 'BUREAU_HEAD',
      isActive: true,
    },
  });

  // 3. Seed Canonical Institutions (100% Synthetic Fictional Samples)
  const instMatrix = await prisma.institution.upsert({
    where: { permanentId: '1-10098765' },
    update: {},
    create: {
      permanentId: '1-10098765',
      name: 'Matrix Institute of Advanced Technology (Synthetic Sample)',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      address: 'Plot 42, Tech Corridor, Electronic City, Bengaluru',
      pinCode: '560100',
      institutionType: 'ENGINEERING_TECHNOLOGY',
      approvalStatus: 'APPROVED',
    },
  });

  const instNational = await prisma.institution.upsert({
    where: { permanentId: '1-20045612' },
    update: {},
    create: {
      permanentId: '1-20045612',
      name: 'National Poly-Engineering Academy (Synthetic Sample)',
      state: 'Maharashtra',
      district: 'Pune',
      address: 'Sector 8, Knowledge Park, Pune',
      pinCode: '411057',
      institutionType: 'POLYTECHNIC',
      approvalStatus: 'UNDER_SCRUTINY',
    },
  });

  const instApex = await prisma.institution.upsert({
    where: { permanentId: '1-30011223' },
    update: {},
    create: {
      permanentId: '1-30011223',
      name: 'Apex Himalayan Academy of Sciences (Synthetic Sample)',
      state: 'Uttarakhand',
      district: 'Dehradun',
      address: 'Hill View Road, Rajpur, Dehradun',
      pinCode: '248009',
      institutionType: 'MANAGEMENT',
      approvalStatus: 'APPROVED',
    },
  });

  // 4. Seed Complaints (Demonstrating multi-bureau filings, independent cases, and overlaps)
  const complaint1 = await prisma.complaint.upsert({
    where: { complaintNumber: 'CMP-2026-0001' },
    update: {},
    create: {
      complaintNumber: 'CMP-2026-0001',
      originalBureauRef: 'APP/2026/G-881',
      institutionId: instMatrix.id,
      bureauId: approvalBureau.id,
      assignedOfficerId: officerAlpha.id,
      subject: 'Discrepancy in sanctioned student intake for B.Tech Computer Science program',
      description:
        'The institution allegedly admitted 180 students against an approved AICTE intake quota of 120 students.',
      category: 'UNAPPROVED_PROGRAM',
      priority: 'HIGH',
      status: 'UNDER_INQUIRY',
      complainantType: 'CITIZEN',
      complainantMaskedId: 'CIT-***-4410',
    },
  });

  const complaint2 = await prisma.complaint.upsert({
    where: { complaintNumber: 'CMP-2026-0002' },
    update: {},
    create: {
      complaintNumber: 'CMP-2026-0002',
      originalBureauRef: 'SGRC/2026/FEE-114',
      institutionId: instMatrix.id,
      bureauId: studentGrievance.id,
      assignedOfficerId: officerBeta.id,
      subject:
        'Exorbitant unapproved development fee levied under threat of withholding hall tickets',
      description:
        'Second year engineering students were coerced into paying an unapproved special lab & development levy of Rs 45,000 without receipt.',
      category: 'FEE_ANOMALY',
      priority: 'CRITICAL',
      status: 'UNDER_INQUIRY',
      complainantType: 'STUDENT',
      complainantMaskedId: 'STU-***-8821',
    },
  });

  const complaint3 = await prisma.complaint.upsert({
    where: { complaintNumber: 'CMP-2026-0003' },
    update: {},
    create: {
      complaintNumber: 'CMP-2026-0003',
      originalBureauRef: 'VIG/2026/FIN-092',
      institutionId: instMatrix.id,
      bureauId: vigilanceBureau.id,
      assignedOfficerId: officerGamma.id,
      subject:
        'Financial irregularity regarding non-refund of caution deposit and unapproved additional fees',
      description:
        'Complaint regarding unauthorized fee collection and withholding mandatory fee refunds upon student course cancellations.',
      category: 'FEE_ANOMALY',
      priority: 'HIGH',
      status: 'UNDER_PRELIMINARY_REVIEW',
      complainantType: 'PARENT',
      complainantMaskedId: 'PAR-***-3091',
    },
  });

  const complaint4 = await prisma.complaint.upsert({
    where: { complaintNumber: 'CMP-2026-0004' },
    update: {},
    create: {
      complaintNumber: 'CMP-2026-0004',
      originalBureauRef: 'ARC/2026/URG-055',
      institutionId: instNational.id,
      bureauId: antiRagging.id,
      subject: 'Senior hostel verbal intimidation incident reported during orientation week',
      description:
        'Report of verbal intimidation and forced late-night assembly in polytechnic hostel block B.',
      category: 'HARASSMENT_RAGGING',
      priority: 'CRITICAL',
      status: 'UNDER_PRELIMINARY_REVIEW',
      complainantType: 'STUDENT',
      complainantMaskedId: 'STU-***-1199',
    },
  });

  const complaint5 = await prisma.complaint.upsert({
    where: { complaintNumber: 'CMP-2026-0005' },
    update: {},
    create: {
      complaintNumber: 'CMP-2026-0005',
      originalBureauRef: 'FSG/2026/SAL-019',
      institutionId: instNational.id,
      bureauId: facultyCell.id,
      subject: 'Delay in disbursement of salary allowances according to 7th Central Pay Commission',
      description:
        'Polytechnic faculty group submitting representation for 6-month delay in revised grade allowances.',
      category: 'FACULTY_NON_COMPLIANCE',
      priority: 'MEDIUM',
      status: 'SUBMITTED',
      complainantType: 'FACULTY',
      complainantMaskedId: 'FAC-***-6512',
    },
  });

  // 5. Seed Case Actions (Audit Timeline - Idempotent upsert)
  await prisma.caseAction.upsert({
    where: { id: 'seed-case-action-001' },
    update: {},
    create: {
      id: 'seed-case-action-001',
      complaintId: complaint2.id,
      officerId: officerBeta.id,
      actionType: 'STATUS_CHANGE',
      previousStatus: 'SUBMITTED',
      newStatus: 'UNDER_INQUIRY',
      notes: 'Initial scrutiny completed. Evidence of unauthorized fee circular obtained.',
    },
  });

  // 6. Seed Overlap Candidate (Enforce canonical ordering: primaryId < candidateId)
  const [primaryId, candidateId] =
    complaint2.id < complaint3.id ? [complaint2.id, complaint3.id] : [complaint3.id, complaint2.id];

  await prisma.overlapCandidate.upsert({
    where: {
      primaryComplaintId_candidateComplaintId: {
        primaryComplaintId: primaryId,
        candidateComplaintId: candidateId,
      },
    },
    update: {},
    create: {
      primaryComplaintId: primaryId,
      candidateComplaintId: candidateId,
      institutionId: instMatrix.id,
      overallScore: 0.85,
      entityScore: 1.0,
      subjectScore: 0.82,
      complainantScore: 0.6,
      temporalScore: 0.95,
      matchingSignals: {
        commonKeywords: ['unapproved fee', 'financial irregularity', 'fee collection', 'refund'],
        daysApart: 8,
        involvedBureaus: ['STUDENT_GRIEVANCE_CELL', 'VIGILANCE_BUREAU'],
        explanation:
          'Both complaints report unauthorized fee levies at Matrix Institute within 8 days of each other.',
      },
      reviewStatus: 'PENDING_REVIEW',
    },
  });

  // 7. Seed Audit Log Record (Idempotent upsert)
  await prisma.auditLog.upsert({
    where: { id: 'seed-audit-log-001' },
    update: {},
    create: {
      id: 'seed-audit-log-001',
      entityType: 'COMPLAINT',
      entityId: complaint2.id,
      action: 'INGEST_COMPLAINT',
      actorId: officerBeta.id,
      actorRole: 'SENIOR_SCRUTINIZER',
      bureauId: studentGrievance.id,
      details: {
        complaintNumber: 'CMP-2026-0002',
        institutionPermanentId: '1-10098765',
        sourceBureau: 'STUDENT_GRIEVANCE_CELL',
      },
    },
  });

  console.log('Seed completed successfully with synthetic demo data.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
