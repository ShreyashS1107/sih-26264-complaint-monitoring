/**
 * Temporal Proximity Scorer for AICTE Complaints
 * Computes filing proximity decay and temporal window signals.
 */

export const NEUTRAL_TEMPORAL_SCORE = 0.2;

export interface TemporalEvaluationResult {
  score: number;
  daysApart: number | null;
  explanation: string;
  isDateComparable: boolean;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculates absolute difference in calendar days between two dates.
 * Returns null if either date is missing, null, undefined, or unparseable.
 */
export function calculateDaysApart(
  dateA: Date | string | null | undefined,
  dateB: Date | string | null | undefined
): number | null {
  if (!dateA || !dateB) {
    return null;
  }

  const dA = new Date(dateA).getTime();
  const dB = new Date(dateB).getTime();

  if (isNaN(dA) || isNaN(dB)) {
    return null;
  }

  const diffMs = Math.abs(dA - dB);
  return Math.floor(diffMs / MS_PER_DAY);
}

/**
 * Computes temporal proximity score (0.0 to 1.0) based on days apart.
 * Follows an exponential decay tailored to AICTE academic/approval cycles:
 * - 0 to 14 days: ~1.0 (Simultaneous or near-instant multi-portal filings)
 * - 15 to 45 days: ~0.90 to 0.80 (Active grievance cluster in same academic quarter)
 * - 46 to 180 days: ~0.75 to 0.50 (Same academic term or approval cycle)
 * - 181 to 365 days: ~0.45 to 0.25 (Previous academic year)
 * - > 365 days: < 0.20 (Historical precedent)
 *
 * If filing dates cannot be compared, returns a neutral default score (0.20)
 * rather than falsely assuming simultaneous filing.
 */
export function evaluateTemporalProximity(
  dateA: Date | string | null | undefined,
  dateB: Date | string | null | undefined,
  halfLifeDays = 90
): TemporalEvaluationResult {
  const days = calculateDaysApart(dateA, dateB);

  if (days === null) {
    return {
      score: NEUTRAL_TEMPORAL_SCORE,
      daysApart: null,
      explanation:
        'Filing dates unverified or unparseable; temporal proximity set to neutral default.',
      isDateComparable: false,
    };
  }

  // Exponential decay function: S(t) = exp(-ln(2) * (t / halfLife))
  const decayRate = Math.LN2 / halfLifeDays;
  const rawScore = Math.exp(-decayRate * days);

  // Clamp strictly between 0.05 and 1.0
  const score = Number(Math.max(0.05, Math.min(1.0, rawScore)).toFixed(4));

  let explanation = '';
  if (days <= 14) {
    explanation = `High temporal proximity: Submitted within ${days} day(s) of each other.`;
  } else if (days <= 60) {
    explanation = `Moderate temporal proximity: Submitted ${days} days apart within the same academic term.`;
  } else if (days <= 180) {
    explanation = `Extended temporal window: Submitted ${days} days apart within the same academic year.`;
  } else {
    explanation = `Low temporal proximity: Submitted ${days} days apart across different academic years.`;
  }

  return {
    score,
    daysApart: days,
    explanation,
    isDateComparable: true,
  };
}
