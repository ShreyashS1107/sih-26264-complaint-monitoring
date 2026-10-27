import { PrismaClient } from '@prisma/client';

/**
 * Safe, read-only database inspection script.
 *
 * Verifies table counts, checks for specific production IDs, and displays sample
 * records without printing or logging connection strings, credentials, or secrets.
 */
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

async function inspectDatabase() {
  console.log('='.repeat(70));
  console.log('AICTE Portal - Safe Read-Only Database Inspection');
  console.log('='.repeat(70));
  console.log(`Configured Host : ${getMaskedHost()}`);
  console.log('Mode            : Strictly Read-Only (0 mutations, 0 deletes, 0 writes)');
  console.log('='.repeat(70));

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not defined.');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('✓ Database Connection: ESTABLISHED\n');

    // 1. Table record counts
    const [
      bureauCount,
      officerCount,
      institutionCount,
      complaintCount,
      overlapCandidateCount,
      caseActionCount,
      auditLogCount,
    ] = await Promise.all([
      prisma.bureau.count(),
      prisma.officer.count(),
      prisma.institution.count(),
      prisma.complaint.count(),
      prisma.overlapCandidate.count(),
      prisma.caseAction.count(),
      prisma.auditLog.count(),
    ]);

    console.log('TABLE COUNTS:');
    console.log(`  • Bureau:             ${bureauCount}`);
    console.log(`  • Officer:            ${officerCount}`);
    console.log(`  • Institution:        ${institutionCount}`);
    console.log(`  • Complaint:          ${complaintCount}`);
    console.log(`  • OverlapCandidate:   ${overlapCandidateCount}`);
    console.log(`  • CaseAction:         ${caseActionCount}`);
    console.log(`  • AuditLog:           ${auditLogCount}`);

    // 2. Check Specific Error IDs
    console.log('\nSPECIFIC PRODUCTION ERROR ID CHECKS:');

    // (A) Institution AICTE-INST-8821 / 1-10928374
    const inst = await prisma.institution.findFirst({
      where: {
        OR: [
          { id: 'AICTE-INST-8821' },
          { permanentId: 'AICTE-INST-8821' },
          { permanentId: '1-10928374' },
          { name: { contains: 'Apex Institute', mode: 'insensitive' } },
        ],
      },
      select: { id: true, permanentId: true, name: true, state: true, district: true },
    });
    if (inst) {
      console.log(`  ✓ Institution [AICTE-INST-8821 / 1-10928374]: FOUND`);
      console.log(`    DB ID: ${inst.id} | Permanent ID: ${inst.permanentId} | Name: ${inst.name}`);
    } else {
      console.log(`  ✗ Institution [AICTE-INST-8821 / 1-10928374]: NOT FOUND (0 matching rows)`);
    }

    // (B) Overlap Candidate OVL-2026-03
    const ovl = await prisma.overlapCandidate.findFirst({
      where: {
        OR: [
          { id: 'OVL-2026-03' },
          {
            AND: [
              { primaryComplaint: { complaintNumber: 'AICTE-2026-8405' } },
              { candidateComplaint: { complaintNumber: 'AICTE-2026-8406' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        primaryComplaintId: true,
        candidateComplaintId: true,
        reviewStatus: true,
      },
    });
    if (ovl) {
      console.log(`  ✓ OverlapCandidate [OVL-2026-03]: FOUND`);
      console.log(`    DB ID: ${ovl.id} | Review Status: ${ovl.reviewStatus}`);
    } else {
      console.log(`  ✗ OverlapCandidate [OVL-2026-03]: NOT FOUND (0 matching rows)`);
    }

    // (C) Complaint AICTE-2026-8404
    const cmp = await prisma.complaint.findFirst({
      where: {
        OR: [
          { id: 'AICTE-2026-8404' },
          { complaintNumber: 'AICTE-2026-8404' },
        ],
      },
      select: { id: true, complaintNumber: true, subject: true, status: true, priority: true },
    });
    if (cmp) {
      console.log(`  ✓ Complaint [AICTE-2026-8404]: FOUND`);
      console.log(`    DB ID: ${cmp.id} | Number: ${cmp.complaintNumber} | Status: ${cmp.status}`);
    } else {
      console.log(`  ✗ Complaint [AICTE-2026-8404]: NOT FOUND (0 matching rows)`);
    }

    // 3. Existing Institutions sample
    if (institutionCount > 0) {
      console.log('\nINSTITUTIONS IN DATABASE (first 5):');
      const insts = await prisma.institution.findMany({
        take: 5,
        select: { id: true, permanentId: true, name: true, state: true },
      });
      for (const i of insts) {
        console.log(`  - [${i.permanentId}] ${i.name} (DB id: ${i.id})`);
      }
    }

    // 4. Existing Complaints list
    if (complaintCount > 0) {
      console.log(`\nCOMPLAINTS IN DATABASE (all ${complaintCount}):`);
      const cmps = await prisma.complaint.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true, complaintNumber: true, status: true, subject: true, createdAt: true },
      });
      for (const c of cmps) {
        console.log(`  - [${c.complaintNumber}] (${c.status}) ${c.subject.slice(0, 50)}... [${c.createdAt.toISOString().slice(0, 10)}]`);
      }
    }

    // 5. Existing Overlap Candidates list
    if (overlapCandidateCount > 0) {
      console.log(`\nOVERLAP CANDIDATES IN DATABASE (all ${overlapCandidateCount}):`);
      const ovls = await prisma.overlapCandidate.findMany({
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          overallScore: true,
          reviewStatus: true,
          primaryComplaint: { select: { complaintNumber: true } },
          candidateComplaint: { select: { complaintNumber: true } },
        },
      });
      for (const o of ovls) {
        console.log(
          `  - [${o.primaryComplaint.complaintNumber} ↔ ${o.candidateComplaint.complaintNumber}] Score: ${Math.round(
            o.overallScore * 100
          )}% | Status: ${o.reviewStatus} (ID: ${o.id})`
        );
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('Inspection complete.');
    console.log('='.repeat(70));
  } catch (err: unknown) {
    console.error('\nDatabase inspection failed:');
    if (err instanceof Error) {
      const safeMsg = err.message.replace(/postgres(ql)?:\/\/[^\s]+/gi, '[DATABASE_URL_REDACTED]');
      console.error(safeMsg);
    } else {
      console.error(String(err));
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDatabase();
