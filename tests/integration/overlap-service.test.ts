import { afterAll, describe, expect, it } from 'vitest';
import { db } from '@/server/db';
import {
  analyzeAndPersistOverlaps,
  getOverlapCandidatesForComplaint,
} from '@/modules/overlap-detection/service';

const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

describe.skipIf(!isDatabaseConfigured)('Overlap Detection Service Database Integration', () => {
  afterAll(async () => {
    await db.$disconnect();
  });

  it('should analyze a complaint, detect overlapping cases, and persist reviewable candidates', async () => {
    // Locate seeded complaints CMP-2026-0002 (Student Grievance) and CMP-2026-0003 (Vigilance)
    const complaint2 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0002' },
      include: { institution: true, bureau: true },
    });

    const complaint3 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0003' },
      include: { institution: true, bureau: true },
    });

    // Run overlap analysis for complaint2
    const result = await analyzeAndPersistOverlaps(complaint2.id, {
      threshold: 0.45,
    });

    expect(result.complaintId).toBe(complaint2.id);
    expect(result.evaluatedPoolSize).toBeGreaterThan(0);
    expect(result.detectedCandidateCount).toBeGreaterThanOrEqual(1);

    // Verify persisted candidate in the database
    const [expectedPrimary, expectedCandidate] =
      complaint2.id < complaint3.id
        ? [complaint2.id, complaint3.id]
        : [complaint3.id, complaint2.id];

    const persistedCandidate = await db.overlapCandidate.findUnique({
      where: {
        primaryComplaintId_candidateComplaintId: {
          primaryComplaintId: expectedPrimary,
          candidateComplaintId: expectedCandidate,
        },
      },
    });

    expect(persistedCandidate).not.toBeNull();
    expect(persistedCandidate?.institutionId).toBe(complaint2.institutionId);
    expect(persistedCandidate?.overallScore).toBeGreaterThanOrEqual(0.45);
    expect(persistedCandidate?.overallScore).toBeLessThanOrEqual(1.0);
    expect(persistedCandidate?.reviewStatus).toBe('FLAGGED_JOINT_REVIEW');

    const signals = persistedCandidate?.matchingSignals as Record<string, unknown>;
    expect(signals).toBeDefined();
    expect(typeof signals.explanation).toBe('string');
    expect(Array.isArray(signals.involvedBureaus)).toBe(true);
    expect(signals.involvedBureaus as string[]).toContain(complaint2.bureau.code);
    expect(signals.involvedBureaus as string[]).toContain(complaint3.bureau.code);
  });

  it('should ensure complaints are never auto-merged, mutated, or deleted during detection', async () => {
    const comp2Before = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0002' },
    });
    const comp3Before = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0003' },
    });

    // Re-run detection multiple times to test idempotency
    await analyzeAndPersistOverlaps(comp2Before.id);
    await analyzeAndPersistOverlaps(comp3Before.id);

    const comp2After = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0002' },
    });
    const comp3After = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0003' },
    });

    // Both complaints must remain completely untouched
    expect(comp2After.id).toBe(comp2Before.id);
    expect(comp2After.status).toBe(comp2Before.status);
    expect(comp2After.originalBureauRef).toBe(comp2Before.originalBureauRef);

    expect(comp3After.id).toBe(comp3Before.id);
    expect(comp3After.status).toBe(comp3Before.status);
    expect(comp3After.originalBureauRef).toBe(comp3Before.originalBureauRef);
  });

  it('should query overlap candidates with related institutions and bureaus for officer review', async () => {
    const complaint2 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0002' },
    });

    const candidates = await getOverlapCandidatesForComplaint(complaint2.id);

    expect(candidates.length).toBeGreaterThanOrEqual(1);
    for (const cand of candidates) {
      expect(cand.primaryComplaint).toBeDefined();
      expect(cand.candidateComplaint).toBeDefined();
      expect(cand.primaryComplaint.bureau).toBeDefined();
      expect(cand.candidateComplaint.bureau).toBeDefined();
      expect(cand.institution).toBeDefined();
      expect(cand.primaryComplaintId < cand.candidateComplaintId).toBe(true);
    }
  });
});
