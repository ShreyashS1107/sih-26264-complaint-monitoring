import { db } from '@/server/db';
import {
  type ComplaintInput,
  type OverlapEvaluationResult,
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
  const threshold = options.threshold ?? 0.5;
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
  const windowStartDate = new Date(
    new Date(target.createdAt).getTime() - windowDays * 24 * 60 * 60 * 1000
  );

  const rawPool = await client.complaint.findMany({
    where: {
      id: { not: targetComplaintId },
      createdAt: { gte: windowStartDate },
    },
    include: {
      institution: true,
      bureau: true,
    },
    take: 200,
  });

  const poolInputs = rawPool.map(mapPrismaComplaintToInput);

  // 3. Run pure deterministic matching engine
  const candidateResults = scanForOverlapCandidates(targetInput, poolInputs, threshold);

  // 4. Persist candidates using idempotent upserts with canonical keying
  for (const result of candidateResults) {
    // Validate record schema before saving
    overlapCandidateRecordSchema.parse(result);

    await client.overlapCandidate.upsert({
      where: {
        primaryComplaintId_candidateComplaintId: {
          primaryComplaintId: result.primaryComplaintId,
          candidateComplaintId: result.candidateComplaintId,
        },
      },
      update: {
        overallScore: result.overallScore,
        entityScore: result.entityScore,
        subjectScore: result.subjectScore,
        complainantScore: result.complainantScore,
        temporalScore: result.temporalScore,
        matchingSignals: result.matchingSignals as any,
        reviewStatus: result.reviewStatus,
      },
      create: {
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
