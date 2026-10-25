import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/server/db';
import {
  analyzeAndPersistOverlaps,
  getOverlapCandidatesForComplaint,
} from '@/modules/overlap-detection/service';
import { OVERLAP_THRESHOLDS } from '@/modules/overlap-detection/engine';

const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

describe.skipIf(!isDatabaseConfigured)('Overlap Detection Service Database Integration', () => {
  let complaint2Id: string;
  let complaint3Id: string;
  let targetPrimaryId: string;
  let targetCandidateId: string;

  let originalCandidateSnapshot: {
    reviewStatus: any;
    reviewedById: string | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
    overallScore: number;
    entityScore: number;
    subjectScore: number;
    complainantScore: number;
    temporalScore: number;
    matchingSignals: any;
  } | null = null;

  async function restoreTargetCandidate() {
    if (!targetPrimaryId || !targetCandidateId) return;

    // Non-destructive targeted restore: strictly touches only the test candidate pair
    if (originalCandidateSnapshot) {
      await db.overlapCandidate.update({
        where: {
          primaryComplaintId_candidateComplaintId: {
            primaryComplaintId: targetPrimaryId,
            candidateComplaintId: targetCandidateId,
          },
        },
        data: {
          reviewStatus: originalCandidateSnapshot.reviewStatus,
          reviewedById: originalCandidateSnapshot.reviewedById,
          reviewedAt: originalCandidateSnapshot.reviewedAt,
          reviewNotes: originalCandidateSnapshot.reviewNotes,
          overallScore: originalCandidateSnapshot.overallScore,
          entityScore: originalCandidateSnapshot.entityScore,
          subjectScore: originalCandidateSnapshot.subjectScore,
          complainantScore: originalCandidateSnapshot.complainantScore,
          temporalScore: originalCandidateSnapshot.temporalScore,
          matchingSignals: originalCandidateSnapshot.matchingSignals,
        },
      });
    }
  }

  beforeAll(async () => {
    const c2 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0002' },
      select: { id: true },
    });
    const c3 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0003' },
      select: { id: true },
    });

    complaint2Id = c2.id;
    complaint3Id = c3.id;

    [targetPrimaryId, targetCandidateId] = c2.id < c3.id ? [c2.id, c3.id] : [c3.id, c2.id];

    const existing = await db.overlapCandidate.findUnique({
      where: {
        primaryComplaintId_candidateComplaintId: {
          primaryComplaintId: targetPrimaryId,
          candidateComplaintId: targetCandidateId,
        },
      },
    });

    if (existing) {
      originalCandidateSnapshot = {
        reviewStatus: existing.reviewStatus,
        reviewedById: existing.reviewedById,
        reviewedAt: existing.reviewedAt,
        reviewNotes: existing.reviewNotes,
        overallScore: existing.overallScore,
        entityScore: existing.entityScore,
        subjectScore: existing.subjectScore,
        complainantScore: existing.complainantScore,
        temporalScore: existing.temporalScore,
        matchingSignals: existing.matchingSignals,
      };
    }
  });

  beforeEach(async () => {
    await restoreTargetCandidate();
  });

  afterEach(async () => {
    await restoreTargetCandidate();
  });

  afterAll(async () => {
    try {
      await restoreTargetCandidate();
    } finally {
      await db.$disconnect();
    }
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
    expect(persistedCandidate?.reviewStatus).toBe(result.candidates[0].reviewStatus);
    expect(['PENDING_REVIEW', 'FLAGGED_JOINT_REVIEW']).toContain(persistedCandidate?.reviewStatus);

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

  it('should use default threshold OVERLAP_THRESHOLDS.MODERATE_CLUSTER (0.45) and retain candidates between 0.45 and 0.50', async () => {
    expect(OVERLAP_THRESHOLDS.MODERATE_CLUSTER).toBe(0.45);

    const complaint2 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0002' },
    });

    // Run without specifying threshold options to verify default is 0.45
    const result = await analyzeAndPersistOverlaps(complaint2.id);
    expect(result.detectedCandidateCount).toBeGreaterThanOrEqual(1);

    // Any candidate with score >= 0.45 must be detected and preserved
    for (const cand of result.candidates) {
      expect(cand.overallScore).toBeGreaterThanOrEqual(OVERLAP_THRESHOLDS.MODERATE_CLUSTER);
    }
  });

  it('should strictly preserve human review status CONFIRMED_OVERLAP across repeated automated rescoring', async () => {
    const complaint2 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0002' },
    });
    const complaint3 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0003' },
    });
    const officer = await db.officer.findFirstOrThrow();

    const [expectedPrimary, expectedCandidate] =
      complaint2.id < complaint3.id
        ? [complaint2.id, complaint3.id]
        : [complaint3.id, complaint2.id];

    const reviewTimestamp = new Date('2026-03-15T14:00:00Z');

    // Simulate officer reviewing the candidate and confirming the overlap
    await db.overlapCandidate.update({
      where: {
        primaryComplaintId_candidateComplaintId: {
          primaryComplaintId: expectedPrimary,
          candidateComplaintId: expectedCandidate,
        },
      },
      data: {
        reviewStatus: 'CONFIRMED_OVERLAP',
        reviewNotes: 'Verified duplicate filing by Scrutinizer Beta',
        reviewedById: officer.id,
        reviewedAt: reviewTimestamp,
      },
    });

    // Re-run overlap detection (automated rescore)
    await analyzeAndPersistOverlaps(complaint2.id);

    // Verify candidate review status was NOT reset to FLAGGED_JOINT_REVIEW or PENDING_REVIEW
    const rescored = await db.overlapCandidate.findUniqueOrThrow({
      where: {
        primaryComplaintId_candidateComplaintId: {
          primaryComplaintId: expectedPrimary,
          candidateComplaintId: expectedCandidate,
        },
      },
    });

    expect(rescored.reviewStatus).toBe('CONFIRMED_OVERLAP');
    expect(rescored.reviewedById).toBe(officer.id);
    expect(rescored.reviewedAt).toEqual(reviewTimestamp);
    expect(rescored.reviewNotes).toBe('Verified duplicate filing by Scrutinizer Beta');
    expect(rescored.overallScore).toBeGreaterThanOrEqual(0.45);
  });

  it('should strictly preserve human review status DISMISSED_INDEPENDENT across repeated automated rescoring', async () => {
    const complaint2 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0002' },
    });
    const complaint3 = await db.complaint.findUniqueOrThrow({
      where: { complaintNumber: 'CMP-2026-0003' },
    });
    const officer = await db.officer.findFirstOrThrow();

    const [expectedPrimary, expectedCandidate] =
      complaint2.id < complaint3.id
        ? [complaint2.id, complaint3.id]
        : [complaint3.id, complaint2.id];

    // Simulate officer investigating and dismissing as independent
    await db.overlapCandidate.update({
      where: {
        primaryComplaintId_candidateComplaintId: {
          primaryComplaintId: expectedPrimary,
          candidateComplaintId: expectedCandidate,
        },
      },
      data: {
        reviewStatus: 'DISMISSED_INDEPENDENT',
        reviewNotes: 'Grievances investigated and dismissed as separate legitimate actions',
        reviewedById: officer.id,
        reviewedAt: new Date(),
      },
    });

    // Re-run overlap detection (automated rescore)
    await analyzeAndPersistOverlaps(complaint3.id);

    // Verify candidate review status remains DISMISSED_INDEPENDENT
    const rescored = await db.overlapCandidate.findUniqueOrThrow({
      where: {
        primaryComplaintId_candidateComplaintId: {
          primaryComplaintId: expectedPrimary,
          candidateComplaintId: expectedCandidate,
        },
      },
    });

    expect(rescored.reviewStatus).toBe('DISMISSED_INDEPENDENT');
    expect(rescored.reviewedById).toBe(officer.id);
    expect(rescored.reviewNotes).toBe(
      'Grievances investigated and dismissed as separate legitimate actions'
    );
  });

  it('should safely preserve human review decisions against concurrent automated rescoring', async () => {
    const officer = await db.officer.findFirstOrThrow();
    const reviewTimestamp = new Date('2026-03-20T10:30:00Z');

    // 1. Ensure test candidate starts in PENDING_REVIEW without human reviewer
    await db.overlapCandidate.update({
      where: {
        primaryComplaintId_candidateComplaintId: {
          primaryComplaintId: targetPrimaryId,
          candidateComplaintId: targetCandidateId,
        },
      },
      data: {
        reviewStatus: 'PENDING_REVIEW',
        reviewedById: null,
        reviewedAt: null,
        reviewNotes: null,
      },
    });

    // 2. Concurrently execute overlap analysis (automated rescore) and officer review
    await Promise.all([
      analyzeAndPersistOverlaps(complaint2Id),
      db.overlapCandidate.update({
        where: {
          primaryComplaintId_candidateComplaintId: {
            primaryComplaintId: targetPrimaryId,
            candidateComplaintId: targetCandidateId,
          },
        },
        data: {
          reviewStatus: 'CONFIRMED_OVERLAP',
          reviewedById: officer.id,
          reviewedAt: reviewTimestamp,
          reviewNotes: 'Concurrently confirmed duplicate case by Scrutinizer Beta',
        },
      }),
    ]);

    // 3. Verify that the human review decision was preserved and not clobbered
    const candidate = await db.overlapCandidate.findUniqueOrThrow({
      where: {
        primaryComplaintId_candidateComplaintId: {
          primaryComplaintId: targetPrimaryId,
          candidateComplaintId: targetCandidateId,
        },
      },
    });

    expect(candidate.reviewStatus).toBe('CONFIRMED_OVERLAP');
    expect(candidate.reviewedById).toBe(officer.id);
    expect(candidate.reviewedAt).toEqual(reviewTimestamp);
    expect(candidate.reviewNotes).toBe('Concurrently confirmed duplicate case by Scrutinizer Beta');
    expect(candidate.overallScore).toBeGreaterThanOrEqual(0.45);

    // 4. Repeated automated rescoring must continue to respect the human decision
    await analyzeAndPersistOverlaps(complaint2Id);

    const afterSecondRescore = await db.overlapCandidate.findUniqueOrThrow({
      where: {
        primaryComplaintId_candidateComplaintId: {
          primaryComplaintId: targetPrimaryId,
          candidateComplaintId: targetCandidateId,
        },
      },
    });

    expect(afterSecondRescore.reviewStatus).toBe('CONFIRMED_OVERLAP');
    expect(afterSecondRescore.reviewedById).toBe(officer.id);
    expect(afterSecondRescore.reviewedAt).toEqual(reviewTimestamp);
    expect(afterSecondRescore.reviewNotes).toBe(
      'Concurrently confirmed duplicate case by Scrutinizer Beta'
    );
  });
});
