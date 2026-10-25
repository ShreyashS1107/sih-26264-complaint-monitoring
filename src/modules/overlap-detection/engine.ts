import {
  calculateCosineSimilarity,
  calculateJaccardSimilarity,
  extractSharedKeywords,
  extractTokens,
} from './tokenizer';
import { type InstitutionIdentity, matchInstitutionIdentity } from './institution-matcher';
import { evaluateTemporalProximity } from './temporal';
import { createCanonicalComplaintPair, type OverlapReviewStatus } from './schema';

export interface ComplaintInput {
  id: string;
  complaintNumber: string;
  originalBureauRef: string;
  bureauId: string;
  bureauCode?: string;
  institutionId: string;
  institution: InstitutionIdentity;
  subject: string;
  description: string;
  category?: string;
  priority?: string;
  complainantType?: string;
  complainantMaskedId?: string | null;
  createdAt: Date | string;
}

export type OverlapRecommendation =
  'FLAG_FOR_JOINT_REVIEW' | 'MONITOR_SYMPTOMATIC_CLUSTER' | 'INDEPENDENT_CASE';

export type OverlapClassification =
  'DIRECT_DUPLICATE' | 'COORDINATED_FILING' | 'SYMPTOMATIC_CLUSTER' | 'INDEPENDENT';

export interface OverlapMatchingSignals {
  commonKeywords: string[];
  daysApart: number | null;
  involvedBureaus: string[];
  entityMatchReason: string;
  temporalExplanation: string;
  explanation: string;
  recommendation: OverlapRecommendation;
  overlapType: OverlapClassification;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface OverlapEvaluationResult {
  primaryComplaintId: string;
  candidateComplaintId: string;
  institutionId: string;
  overallScore: number;
  entityScore: number;
  subjectScore: number;
  complainantScore: number;
  temporalScore: number;
  matchingSignals: OverlapMatchingSignals;
  reviewStatus: OverlapReviewStatus;
}

/**
 * Weights for the multi-attribute overlap detection model.
 * Sum = 1.0
 */
export const SCORING_WEIGHTS = {
  ENTITY: 0.35,
  SUBJECT: 0.4,
  TEMPORAL: 0.15,
  COMPLAINANT: 0.1,
} as const;

/**
 * Thresholds for review classification.
 */
export const OVERLAP_THRESHOLDS = {
  HIGH_OVERLAP: 0.65, // Recommend joint bureau inquiry / coordination advisory
  MODERATE_CLUSTER: 0.45, // Flag for advisory cross-bureau visibility
  LOW_MINIMUM: 0.3, // Below this, complaints are treated as independent
} as const;

/**
 * Computes complainant linkage score based on privacy-masked indicators.
 */
export function evaluateComplainantLinkage(
  compA: ComplaintInput,
  compB: ComplaintInput
): { score: number; isDirectComplainantMatch: boolean } {
  const idA = compA.complainantMaskedId?.trim();
  const idB = compB.complainantMaskedId?.trim();

  // If both carry non-empty masked IDs and they match exactly
  if (idA && idB && idA === idB) {
    return { score: 1.0, isDirectComplainantMatch: true };
  }

  // Same complainant type (e.g., both students or both faculty)
  if (
    compA.complainantType &&
    compB.complainantType &&
    compA.complainantType === compB.complainantType
  ) {
    return { score: 0.5, isDirectComplainantMatch: false };
  }

  return { score: 0.2, isDirectComplainantMatch: false };
}

/**
 * Evaluates text similarity between two complaints across subjects and descriptions.
 */
export function evaluateSubjectSimilarity(
  compA: ComplaintInput,
  compB: ComplaintInput
): { score: number; commonKeywords: string[] } {
  // 1. Evaluate subject line similarity (concise core grievance summary)
  const subjectTokensA = extractTokens(compA.subject);
  const subjectTokensB = extractTokens(compB.subject);
  const subjectCosine = calculateCosineSimilarity(subjectTokensA.stems, subjectTokensB.stems);

  // 2. Evaluate full narrative similarity (subject + description)
  const fullTextA = `${compA.subject}. ${compA.description}`;
  const fullTextB = `${compB.subject}. ${compB.description}`;
  const fullTokensA = extractTokens(fullTextA);
  const fullTokensB = extractTokens(fullTextB);
  const fullCosine = calculateCosineSimilarity(fullTokensA.stems, fullTokensB.stems);

  // 3. Evaluate shared compound phrase bigrams (guarded so empty sets never yield phantom similarity)
  const bigramJaccard =
    fullTokensA.bigrams.length > 0 && fullTokensB.bigrams.length > 0
      ? calculateJaccardSimilarity(fullTokensA.bigrams, fullTokensB.bigrams)
      : 0.0;

  // Composite subject score: 40% subject headline, 45% full narrative, 15% phrase overlap
  let rawScore = subjectCosine * 0.4 + fullCosine * 0.45 + bigramJaccard * 0.15;
  rawScore = Math.max(rawScore, fullCosine * 0.85 + bigramJaccard * 0.15);

  // Category congruence bonus/penalty:
  // Concordant category strengthens topic relevance (only if lexical overlap exists), conflicting category dampens it.
  if (compA.category && compB.category) {
    if (compA.category === compB.category) {
      if (rawScore > 0) {
        rawScore = Math.min(1.0, rawScore * 1.15 + 0.05);
      }
    } else {
      rawScore = rawScore * 0.6;
    }
  }

  const commonKeywords = extractSharedKeywords(fullTextA, fullTextB);
  const score = Number(Math.min(1.0, Math.max(0.0, rawScore)).toFixed(4));

  return { score, commonKeywords };
}

/**
 * Pure, deterministic matching engine evaluating a pair of AICTE complaints.
 * Computes explainable multi-attribute scores and structured matching signals.
 */
export function evaluateComplaintPair(
  compA: ComplaintInput,
  compB: ComplaintInput
): OverlapEvaluationResult {
  // 1. Enforce canonical ordering (idA < idB) and reject self-matches
  const { primaryComplaintId, candidateComplaintId } = createCanonicalComplaintPair(
    compA.id,
    compB.id
  );

  const [first, second] = compA.id === primaryComplaintId ? [compA, compB] : [compB, compA];

  // 2. Evaluate Institution Identity
  const entityResult = matchInstitutionIdentity(first.institution, second.institution);
  const entityScore = entityResult.score;

  // 3. Evaluate Subject & Allegation Similarity
  const { score: subjectScore, commonKeywords } = evaluateSubjectSimilarity(first, second);

  // 4. Evaluate Temporal Proximity
  const temporalResult = evaluateTemporalProximity(first.createdAt, second.createdAt);
  const temporalScore = temporalResult.score;

  // 5. Evaluate Complainant Linkage
  const { score: complainantScore, isDirectComplainantMatch } = evaluateComplainantLinkage(
    first,
    second
  );

  // 6. Compute Overall Composite Score
  // CRITICAL RULE 1: If entityScore is near zero (different institutions), overall overlap MUST collapse.
  // CRITICAL RULE 2: If subjectScore is very low (< 0.30), complaints are distinct matters;
  // temporal proximity must not artificially boost unrelated grievances into clusters.
  let overallScore = 0.0;
  if (entityScore < 0.25) {
    overallScore = Number((entityScore * 0.5).toFixed(4));
  } else {
    const effectiveTemporalScore =
      subjectScore < 0.3 ? temporalScore * (subjectScore / 0.3) : temporalScore;

    overallScore = Number(
      (
        entityScore * SCORING_WEIGHTS.ENTITY +
        subjectScore * SCORING_WEIGHTS.SUBJECT +
        effectiveTemporalScore * SCORING_WEIGHTS.TEMPORAL +
        complainantScore * SCORING_WEIGHTS.COMPLAINANT
      ).toFixed(4)
    );
  }

  // 7. Derive Overlap Classification & Explainable Signals
  const involvedBureaus = Array.from(
    new Set([first.bureauCode ?? first.bureauId, second.bureauCode ?? second.bureauId])
  );

  let overlapType: OverlapClassification = 'INDEPENDENT';
  let recommendation: OverlapRecommendation = 'INDEPENDENT_CASE';
  let severity: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  let explanation = '';

  const instName = first.institution.name || second.institution.name;

  if (
    overallScore >= OVERLAP_THRESHOLDS.HIGH_OVERLAP &&
    entityScore >= 0.75 &&
    subjectScore >= 0.35
  ) {
    severity = 'HIGH';
    recommendation = 'FLAG_FOR_JOINT_REVIEW';

    const timeWindowText =
      temporalResult.daysApart !== null
        ? `within ${temporalResult.daysApart} day(s)`
        : 'with unverified filing interval';

    if (isDirectComplainantMatch) {
      overlapType = 'DIRECT_DUPLICATE';
      explanation = `High confidence direct duplicate (${Math.round(overallScore * 100)}%): Identical complainant multi-filed against ${instName} across ${involvedBureaus.join(' and ')} ${timeWindowText}.`;
    } else {
      overlapType = 'COORDINATED_FILING';
      explanation = `High confidence coordinated filing (${Math.round(overallScore * 100)}%): Similar grievances alleging ${commonKeywords.slice(0, 3).join(', ') || 'related non-compliance'} against ${instName} submitted across ${involvedBureaus.join(' and ')} ${timeWindowText}.`;
    }
  } else if (
    overallScore >= OVERLAP_THRESHOLDS.MODERATE_CLUSTER &&
    entityScore >= 0.75 &&
    subjectScore >= 0.25
  ) {
    const timeWindowText =
      temporalResult.daysApart !== null
        ? `within ${temporalResult.daysApart} day(s)`
        : 'with unverified filing interval';

    severity = 'MEDIUM';
    recommendation = 'MONITOR_SYMPTOMATIC_CLUSTER';
    overlapType = 'SYMPTOMATIC_CLUSTER';
    explanation = `Symptomatic grievance cluster (${Math.round(overallScore * 100)}%): Multiple filings with overlapping themes (${commonKeywords.slice(0, 3).join(', ') || 'institutional governance'}) targeting ${instName} ${timeWindowText}.`;
  } else {
    severity = 'LOW';
    recommendation = 'INDEPENDENT_CASE';
    overlapType = 'INDEPENDENT';

    if (entityScore >= 0.75) {
      explanation = `Distinct matters for same institution (${Math.round(overallScore * 100)}%): Both complaints concern ${instName}, but allege distinct grievances (${first.category ?? 'Case A'} vs ${second.category ?? 'Case B'}).`;
    } else {
      explanation = `Independent cases (${Math.round(overallScore * 100)}%): Grievances concern distinct institutions (${entityResult.reason}).`;
    }
  }

  const reviewStatus: OverlapReviewStatus =
    recommendation === 'FLAG_FOR_JOINT_REVIEW' ? 'FLAGGED_JOINT_REVIEW' : 'PENDING_REVIEW';

  return {
    primaryComplaintId,
    candidateComplaintId,
    institutionId: first.institutionId || second.institutionId,
    overallScore,
    entityScore,
    subjectScore,
    complainantScore,
    temporalScore,
    matchingSignals: {
      commonKeywords,
      daysApart: temporalResult.daysApart,
      involvedBureaus,
      entityMatchReason: entityResult.reason,
      temporalExplanation: temporalResult.explanation,
      explanation,
      recommendation,
      overlapType,
      severity,
    },
    reviewStatus,
  };
}

/**
 * Scans a target complaint against a candidate pool of complaints.
 * Filters and returns detected candidate overlaps above the given threshold,
 * sorted by overall similarity score descending.
 */
export function scanForOverlapCandidates(
  targetComplaint: ComplaintInput,
  candidatePool: ComplaintInput[],
  threshold: number = OVERLAP_THRESHOLDS.MODERATE_CLUSTER
): OverlapEvaluationResult[] {
  const results: OverlapEvaluationResult[] = [];

  for (const candidate of candidatePool) {
    // Avoid self-comparison
    if (candidate.id === targetComplaint.id) continue;

    const evaluation = evaluateComplaintPair(targetComplaint, candidate);
    if (evaluation.overallScore >= threshold) {
      results.push(evaluation);
    }
  }

  // Sort candidates by highest overall similarity score first
  return results.sort((a, b) => b.overallScore - a.overallScore);
}
