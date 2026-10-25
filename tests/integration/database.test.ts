import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/server/db';

const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

describe.skipIf(!isDatabaseConfigured)('PostgreSQL Database Integration & Relation Rules', () => {
  afterAll(async () => {
    await db.$disconnect();
  });

  it('should successfully connect and query seeded institutions', async () => {
    const institutions = await db.institution.findMany({
      orderBy: { permanentId: 'asc' },
    });

    expect(institutions.length).toBeGreaterThanOrEqual(3);
    expect(institutions.some((i) => i.permanentId === '1-10098765')).toBe(true);
  });

  it('should query complaints with institution and bureau relations', async () => {
    const complaint = await db.complaint.findUnique({
      where: { complaintNumber: 'CMP-2026-0002' },
      include: {
        institution: true,
        bureau: true,
        caseActions: true,
      },
    });

    expect(complaint).not.toBeNull();
    expect(complaint?.institution.permanentId).toBe('1-10098765');
    expect(complaint?.bureau.code).toBe('STUDENT_GRIEVANCE_CELL');
    expect(complaint?.caseActions.length).toBeGreaterThanOrEqual(1);
  });

  it('should verify OverlapCandidate satisfies canonical ordering', async () => {
    const candidates = await db.overlapCandidate.findMany({
      include: {
        primaryComplaint: true,
        candidateComplaint: true,
        institution: true,
      },
    });

    expect(candidates.length).toBeGreaterThanOrEqual(1);
    for (const c of candidates) {
      expect(c.primaryComplaintId < c.candidateComplaintId).toBe(true);
      expect(c.overallScore).toBeGreaterThanOrEqual(0.0);
      expect(c.overallScore).toBeLessThanOrEqual(1.0);
    }
  });

  it('should reject a self-match at database level via check constraint', async () => {
    const complaint = await db.complaint.findFirstOrThrow();

    await expect(
      db.overlapCandidate.create({
        data: {
          primaryComplaintId: complaint.id,
          candidateComplaintId: complaint.id, // Self-match!
          institutionId: complaint.institutionId,
          overallScore: 0.99,
          entityScore: 1.0,
          subjectScore: 0.99,
          complainantScore: 0.5,
          temporalScore: 1.0,
          matchingSignals: {
            explanation: 'Self-match test',
          },
        },
      })
    ).rejects.toThrow();
  });

  it('should reject score out of bounds at database level via check constraint', async () => {
    const complaints = await db.complaint.findMany({ take: 2 });
    if (complaints.length < 2) return;

    const [first, second] =
      complaints[0].id < complaints[1].id
        ? [complaints[0], complaints[1]]
        : [complaints[1], complaints[0]];

    await expect(
      db.overlapCandidate.create({
        data: {
          primaryComplaintId: first.id,
          candidateComplaintId: second.id,
          institutionId: first.institutionId,
          overallScore: 1.5, // Out of bounds (> 1.0)!
          entityScore: 1.0,
          subjectScore: 1.0,
          complainantScore: 1.0,
          temporalScore: 1.0,
          matchingSignals: {
            explanation: 'Invalid score bound test',
          },
        },
      })
    ).rejects.toThrow();
  });
});
