import { PrismaClient, OfficerRole } from '@prisma/client';

const prisma = new PrismaClient();

interface BureauSeedData {
  code: string;
  name: string;
  description: string;
}

interface OfficerSeedData {
  badgeNumber: string;
  name: string;
  email: string;
  bureauCode: string;
  role: OfficerRole;
}

const DEMO_BUREAUS: BureauSeedData[] = [
  {
    code: 'APPROVAL_BUREAU',
    name: 'Approval Bureau',
    description:
      'Handles institutional approvals, extension of approval (EoA), and sanctioned intake compliances.',
  },
  {
    code: 'STUDENT_GRIEVANCE_CELL',
    name: 'Student Grievance Redressal Cell',
    description:
      'Monitors student welfare, unapproved fee hikes, academic victimization, and mark sheet retention.',
  },
  {
    code: 'VIGILANCE_BUREAU',
    name: 'Vigilance Bureau',
    description:
      'Investigates financial irregularities, false compliance affidavits, and administrative malpractices.',
  },
  {
    code: 'FACULTY_GRIEVANCE_CELL',
    name: 'Faculty & Staff Grievance Cell',
    description:
      'Adjudicates non-payment of UGC/AICTE pay scales, arbitrary terminations, and service conditions.',
  },
  {
    code: 'ANTI_RAGGING_CELL',
    name: 'Anti-Ragging Monitoring Cell',
    description: 'Urgent tracking of ragging complaints and hostel safety compliance.',
  },
];

const DEMO_OFFICERS: OfficerSeedData[] = [
  {
    badgeNumber: 'OFF-AICTE-000',
    name: 'Dr. S. K. Rao (Central Admin)',
    email: 'dr.sk.rao@demo.aicte.internal',
    bureauCode: 'APPROVAL_BUREAU',
    role: 'CENTRAL_ADMIN',
  },
  {
    badgeNumber: 'OFF-AICTE-001',
    name: 'Case Officer Alpha (Demo)',
    email: 'officer.alpha@demo.aicte.internal',
    bureauCode: 'APPROVAL_BUREAU',
    role: 'CASE_OFFICER',
  },
  {
    badgeNumber: 'OFF-AICTE-002',
    name: 'Scrutinizer Beta (Demo)',
    email: 'officer.beta@demo.aicte.internal',
    bureauCode: 'STUDENT_GRIEVANCE_CELL',
    role: 'SENIOR_SCRUTINIZER',
  },
  {
    badgeNumber: 'OFF-AICTE-003',
    name: 'Inspector Gamma (Demo)',
    email: 'officer.gamma@demo.aicte.internal',
    bureauCode: 'VIGILANCE_BUREAU',
    role: 'BUREAU_HEAD',
  },
];

/**
 * Masks database connection string to safely log destination host without leaking secrets.
 */
function getMaskedHost(): string {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return 'DATABASE_URL not set';
  try {
    const parsed = new URL(dbUrl);
    return `${parsed.protocol}//***:***@${parsed.host}${parsed.pathname}`;
  } catch {
    return 'custom connection string (masked)';
  }
}

async function provisionDemoOfficers() {
  console.log('='.repeat(70));
  console.log('AICTE Portal - Safe Demo Officer Provisioning');
  console.log('='.repeat(70));
  console.log(`Target Database : ${getMaskedHost()}`);
  console.log('Mode            : Idempotent Upsert (Preserves existing production records)');
  console.log('Scope           : 5 Bureaus & 4 Demo Officers ONLY');
  console.log('='.repeat(70));

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not defined.');
    process.exit(1);
  }

  // 1. Provision Bureaus (Idempotent upsert)
  console.log('\n[1/2] Upserting institutional bureaus...');
  const bureauMap = new Map<string, string>();

  for (const b of DEMO_BUREAUS) {
    const record = await prisma.bureau.upsert({
      where: { code: b.code },
      update: {
        name: b.name,
        description: b.description,
        isActive: true,
      },
      create: {
        code: b.code,
        name: b.name,
        description: b.description,
        isActive: true,
      },
    });
    bureauMap.set(b.code, record.id);
    console.log(`  ✓ Bureau: ${b.code} (${b.name})`);
  }

  // 2. Provision Demo Officers (Idempotent upsert)
  console.log('\n[2/2] Upserting demo officer accounts...');
  for (const off of DEMO_OFFICERS) {
    const bureauId = bureauMap.get(off.bureauCode);
    if (!bureauId) {
      throw new Error(`Referenced bureau code '${off.bureauCode}' could not be resolved.`);
    }

    const record = await prisma.officer.upsert({
      where: { badgeNumber: off.badgeNumber },
      update: {
        name: off.name,
        email: off.email,
        bureauId,
        role: off.role,
        isActive: true,
      },
      create: {
        badgeNumber: off.badgeNumber,
        name: off.name,
        email: off.email,
        bureauId,
        role: off.role,
        isActive: true,
      },
    });

    console.log(
      `  ✓ Officer: [${record.badgeNumber}] ${record.name} | Role: ${record.role} | Email: ${record.email}`
    );
  }

  console.log('\n' + '='.repeat(70));
  console.log('✓ Successfully verified and provisioned demo officers.');
  console.log('Zero complaints, institutions, or audit records were altered or deleted.');
  console.log('='.repeat(70));
}

provisionDemoOfficers()
  .catch((err: unknown) => {
    console.error('\nProvisioning failed:');
    if (err instanceof Error) {
      // Exclude raw connection strings if they happen to appear in error messages
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
