import { extractTokens, normalizeText } from './tokenizer';

export interface InstitutionIdentity {
  permanentId?: string | null;
  name: string;
  state?: string | null;
  district?: string | null;
}

export type InstitutionMatchType =
  'EXACT_PERMANENT_ID' | 'FALLBACK_NAME_LOCATION' | 'DIFFERENT_INSTITUTION';

export interface InstitutionMatchResult {
  score: number;
  matchType: InstitutionMatchType;
  reason: string;
}

const GENERIC_INSTITUTION_TERMS = new Set([
  'institute',
  'college',
  'of',
  'technology',
  'engineering',
  'polytechnic',
  'academy',
  'management',
  'science',
  'sciences',
  'research',
  'higher',
  'education',
  'group',
  'institutions',
  'campus',
  'technical',
  'university',
  'deemed',
  'national',
  'state',
  'centre',
  'center',
  'and',
  'the',
  'for',
  'in',
  'at',
]);

/**
 * Extracts distinctive core tokens from an institution's name, filtering out
 * recurring generic administrative words like 'college of engineering'.
 */
export function extractDistinctiveNameTokens(name: string): string[] {
  const normalized = normalizeText(name);
  const words = normalized.split(' ').filter((w) => w.length > 2);
  const distinctive = words.filter((w) => !GENERIC_INSTITUTION_TERMS.has(w));
  return distinctive.length > 0 ? distinctive : words;
}

/**
 * Computes Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[m][n];
}

/**
 * Computes normalized string similarity (0.0 to 1.0).
 */
export function calculateNormalizedStringSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);
  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Evaluates institution identity match between two complaint entities.
 * Follows Rule:
 * 1. AICTE Permanent ID is the primary, strongest signal when available.
 * 2. Fallback to name and location matching only when Permanent IDs are missing or unverified.
 */
export function matchInstitutionIdentity(
  instA: InstitutionIdentity,
  instB: InstitutionIdentity
): InstitutionMatchResult {
  const idA = instA.permanentId?.trim();
  const idB = instB.permanentId?.trim();

  // 1. Primary Rule: Both have verified AICTE Permanent IDs
  if (idA && idB) {
    if (idA === idB) {
      return {
        score: 1.0,
        matchType: 'EXACT_PERMANENT_ID',
        reason: `Canonical match: Verified AICTE Permanent Institute ID (${idA})`,
      };
    } else {
      return {
        score: 0.0,
        matchType: 'DIFFERENT_INSTITUTION',
        reason: `Distinct institutions: AICTE IDs differ (${idA} vs ${idB})`,
      };
    }
  }

  // 2. Fallback Rule: One or both Permanent IDs are missing
  const stateA = instA.state?.trim().toLowerCase();
  const stateB = instB.state?.trim().toLowerCase();
  const districtA = instA.district?.trim().toLowerCase();
  const districtB = instB.district?.trim().toLowerCase();

  // Geographic conflict check: Different states indicates different institutions
  if (stateA && stateB && stateA !== stateB) {
    return {
      score: 0.05,
      matchType: 'DIFFERENT_INSTITUTION',
      reason: `Geographic mismatch: Located in different states (${instA.state} vs ${instB.state})`,
    };
  }

  // Location confidence
  let locationConfidence = 0.5;
  if (stateA && stateB && stateA === stateB) {
    locationConfidence = 0.7;
    if (districtA && districtB && districtA === districtB) {
      locationConfidence = 1.0;
    }
  }

  // Distinctive Name Token Similarity
  const tokensA = extractDistinctiveNameTokens(instA.name);
  const tokensB = extractDistinctiveNameTokens(instB.name);

  const sharedTokens = tokensA.filter((t) => tokensB.includes(t));
  const unionTokens = new Set([...tokensA, ...tokensB]);
  const tokenJaccard = unionTokens.size === 0 ? 0 : sharedTokens.length / unionTokens.size;

  const rawStringSim = calculateNormalizedStringSimilarity(instA.name, instB.name);
  const nameSimilarity = Math.max(tokenJaccard, rawStringSim);

  // Weighted composite fallback score: 70% name match, 30% location match
  const fallbackScore = Number((nameSimilarity * 0.7 + locationConfidence * 0.3).toFixed(4));

  if (fallbackScore >= 0.75) {
    return {
      score: fallbackScore,
      matchType: 'FALLBACK_NAME_LOCATION',
      reason: `Fallback match: High institutional name similarity (${Math.round(nameSimilarity * 100)}%) in ${instA.district ?? 'same region'}, ${instA.state ?? 'matching state'}`,
    };
  } else if (fallbackScore >= 0.5) {
    return {
      score: fallbackScore,
      matchType: 'FALLBACK_NAME_LOCATION',
      reason: `Possible institutional match: Moderate name similarity (${Math.round(nameSimilarity * 100)}%) requiring human verification`,
    };
  } else {
    return {
      score: fallbackScore,
      matchType: 'DIFFERENT_INSTITUTION',
      reason: `Distinct institutions: Low name similarity (${Math.round(nameSimilarity * 100)}%)`,
    };
  }
}
