import { db } from '@/server/db';
import {
  type ComplaintInput,
  type OverlapEvaluationResult,
  OVERLAP_THRESHOLDS,
  scanForOverlapCandidates,
} from './engine';
import { type OverlapCandidateRecord, overlapCandidateRecordSchema } from './schema';
import type { PrismaClient } from '@prisma/client';

/**
 * Maps a Prisma complaint record to the engine's ComplaintInput structure.
 */
function mapPrismaComplaintToInput(complaint: any): ComplaintInput {
  return {
    id: complaint.id,
    complaintNumber: complaint.complaintNumber,
    originalBureauRef: complaint.originalBureauRef,
    bureauId: complaint.bureauId,
    bureauCode: complaint.bureau?.code,
    institutionId: complaint.institutionId,
    institution: {
      permanentId: complaint.institution?.permanentId,
      name: complaint.institution?.name ?? 'Unknown Institution',
      state: complaint.institution?.state,
      district: complaint.institution?.district,
    },
    subject: complaint.subject,
    description: complaint.description,
    category: complaint.category,
    priority: complaint.priority,
    complainantType: complaint.complainantType,
    complainantMaskedId: complaint.complainantMaskedId,
    createdAt: complaint.createdAt,
  };
}

export interface OverlapSyncResult {
  complaintId: string;
  evaluatedPoolSize: number;
  detectedCandidateCount: number;
  candidates: OverlapEvaluationResult[];
}

/**
 * Service to analyze, detect, and persist overlap candidates for a given complaint.
 * Ensures complaints are NEVER automatically merged, modified, or deleted.
 * Preserves human review decisions (CONFIRMED_OVERLAP / DISMISSED_INDEPENDENT) during rescoring.
 */
export async function analyzeAndPersistOverlaps(
  targetComplaintId: string,
  options: {
    threshold?: number;
    prisma?: PrismaClient;
    temporalWindowDays?: number;
  } = {}
): Promise<OverlapSyncResult> {
  const client = (options.prisma ?? db) as PrismaClient;
  const threshold = options.threshold ?? OVERLAP_THRESHOLDS.MODERATE_CLUSTER;
  const windowDays = options.temporalWindowDays ?? 365;

  // 1. Fetch target complaint with related institution and bureau
  const target = await client.complaint.findUnique({
    where: { id: targetComplaintId },
    include: {
      institution: true,
      bureau: true,
    },
  });

  if (!target) {
    throw new Error(`Complaint with ID '${targetComplaintId}' not found.`);
  }

  const targetInput = mapPrismaComplaintToInput(target);

  // 2. Fetch candidate pool: Active complaints within temporal window
  // Deterministic candidate pool selection:
  // Symmetric temporal window around target complaint date
  const windowStartDate = new Date(
    new Date(target.createdAt).getTime() - windowDays * 24 * 60 * 60 * 1000
  );
  const windowEndDate = new Date(
    new Date(target.createdAt).getTime() + windowDays * 24 * 60 * 60 * 1000
  );

  // Candidate pool capped at 200 records per scan with deterministic ordering
  // Primary order: Most recently created first
  // Tie-breaker: Unique complaint ID ascending
  const rawPool = await client.complaint.findMany({
    where: {
      id: { not: targetComplaintId },
      createdAt: {
        gte: windowStartDate,
        lte: windowEndDate,
      },
    },
    include: {
      institution: true,
      bureau: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    take: 200,
  });

  const poolInputs = rawPool.map(mapPrismaComplaintToInput);

  // 3. Run pure deterministic matching engine
  const candidateResults = scanForOverlapCandidates(targetInput, poolInputs, threshold);

  // 4. Persist candidates using idempotent upserts with canonical keying
  // Wrapped in transaction with row locking and conditional update to safely preserve human review decisions
  for (const result of candidateResults) {
    // Validate record schema before saving
    overlapCandidateRecordSchema.parse(result);

    await client.$transaction(async (tx) => {
      // 1. Acquire row-level lock on existing candidate in PostgreSQL to serialize concurrent transactions
      const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "OverlapCandidate"
        WHERE "primaryComplaintId" = ${result.primaryComplaintId}
          AND "candidateComplaintId" = ${result.candidateComplaintId}
        FOR UPDATE
      `;

      if (lockedRows.length > 0) {
        // Candidate already exists.
        // Step A: Rescoring ALWAYS updates similarity scores and matching evidence
        await tx.overlapCandidate.update({
          where: {
            primaryComplaintId_candidateComplaintId: {
              primaryComplaintId: result.primaryComplaintId,
              candidateComplaintId: result.candidateComplaintId,
            },
          },
          data: {
            overallScore: result.overallScore,
            entityScore: result.entityScore,
            subjectScore: result.subjectScore,
            complainantScore: result.complainantScore,
            temporalScore: result.temporalScore,
            matchingSignals: result.matchingSignals as any,
          },
        });

        // Step B: Conditionally update reviewStatus ONLY IF the candidate has NOT been human-reviewed.
        // Even under concurrent transactions, an officer's CONFIRMED_OVERLAP or DISMISSED_INDEPENDENT
        // decision, or any candidate with assigned reviewer/timestamps/notes, is NEVER overwritten.
        await tx.overlapCandidate.updateMany({
          where: {
            primaryComplaintId: result.primaryComplaintId,
            candidateComplaintId: result.candidateComplaintId,
            reviewStatus: { notIn: ['CONFIRMED_OVERLAP', 'DISMISSED_INDEPENDENT'] },
            reviewedById: null,
            reviewedAt: null,
            reviewNotes: null,
          },
          data: {
            reviewStatus: result.reviewStatus,
          },
        });
      } else {
        // Candidate does not exist yet; create with initial engine recommendation status
        try {
          await tx.overlapCandidate.create({
            data: {
              primaryComplaintId: result.primaryComplaintId,
              candidateComplaintId: result.candidateComplaintId,
              institutionId: result.institutionId,
              overallScore: result.overallScore,
              entityScore: result.entityScore,
              subjectScore: result.subjectScore,
              complainantScore: result.complainantScore,
              temporalScore: result.temporalScore,
              matchingSignals: result.matchingSignals as any,
              reviewStatus: result.reviewStatus,
            },
          });
        } catch (createError: unknown) {
          // If a concurrent process created this candidate first (P2002 unique constraint violation)
          const isUniqueConstraint =
            typeof createError === 'object' &&
            createError !== null &&
            'code' in createError &&
            (createError as { code: string }).code === 'P2002';

          if (isUniqueConstraint) {
            await tx.overlapCandidate.update({
              where: {
                primaryComplaintId_candidateComplaintId: {
                  primaryComplaintId: result.primaryComplaintId,
                  candidateComplaintId: result.candidateComplaintId,
                },
              },
              data: {
                overallScore: result.overallScore,
                entityScore: result.entityScore,
                subjectScore: result.subjectScore,
                complainantScore: result.complainantScore,
                temporalScore: result.temporalScore,
                matchingSignals: result.matchingSignals as any,
              },
            });

            await tx.overlapCandidate.updateMany({
              where: {
                primaryComplaintId: result.primaryComplaintId,
                candidateComplaintId: result.candidateComplaintId,
                reviewStatus: { notIn: ['CONFIRMED_OVERLAP', 'DISMISSED_INDEPENDENT'] },
                reviewedById: null,
                reviewedAt: null,
                reviewNotes: null,
              },
              data: {
                reviewStatus: result.reviewStatus,
              },
            });
          } else {
            throw createError;
          }
        }
      }
    });
  }

  return {
    complaintId: targetComplaintId,
    evaluatedPoolSize: poolInputs.length,
    detectedCandidateCount: candidateResults.length,
    candidates: candidateResults,
  };
}

/**
 * Retrieves persisted overlap candidates for a complaint, including bureau and institution metadata.
 */
export async function getOverlapCandidatesForComplaint(
  complaintId: string,
  prisma: PrismaClient = db as PrismaClient
) {
  return prisma.overlapCandidate.findMany({
    where: {
      OR: [{ primaryComplaintId: complaintId }, { candidateComplaintId: complaintId }],
    },
    include: {
      primaryComplaint: {
        include: {
          bureau: true,
          institution: true,
        },
      },
      candidateComplaint: {
        include: {
          bureau: true,
          institution: true,
        },
      },
      institution: true,
      reviewedBy: true,
    },
    orderBy: { overallScore: 'desc' },
  });
}
