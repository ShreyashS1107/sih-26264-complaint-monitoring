/**
 * Text Tokenizer and Lexical Normalizer for AICTE Complaints
 * Pure, deterministic text processing optimized for administrative grievance language.
 */

// Common English stopwords and generic administrative boilerplate
const STOPWORDS = new Set([
  'a',
  'about',
  'above',
  'after',
  'again',
  'against',
  'all',
  'am',
  'an',
  'and',
  'any',
  'are',
  "aren't",
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'by',
  'can',
  "can't",
  'cannot',
  'could',
  'did',
  'do',
  'does',
  'doing',
  "don't",
  'down',
  'during',
  'each',
  'few',
  'for',
  'from',
  'further',
  'had',
  'has',
  'have',
  'having',
  'he',
  'her',
  'here',
  'hers',
  'herself',
  'him',
  'himself',
  'his',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  "isn't",
  'it',
  'its',
  'itself',
  "let's",
  'me',
  'more',
  'most',
  'my',
  'myself',
  'no',
  'nor',
  'not',
  'of',
  'off',
  'on',
  'once',
  'only',
  'or',
  'other',
  'ought',
  'our',
  'ours',
  'ourselves',
  'out',
  'over',
  'own',
  'same',
  'she',
  'should',
  'so',
  'some',
  'such',
  'than',
  'that',
  'the',
  'their',
  'theirs',
  'them',
  'themselves',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  'very',
  'was',
  "wasn't",
  'we',
  'were',
  "weren't",
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'whom',
  'why',
  'with',
  "won't",
  'would',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
  // Administrative generic boilerplate terms
  'complaint',
  'grievance',
  'matter',
  'regarding',
  'respectfully',
  'kindly',
  'request',
  'dear',
  'sir',
  'madam',
  'submitted',
  'application',
  'institution',
  'college',
  'alleged',
  'details',
  'further',
  'stated',
  'dated',
  'received',
  'pertaining',
  'concerned',
  'council',
]);

/**
 * Normalizes administrative grievance text by lowercasing, stripping punctuation,
 * and normalizing technical abbreviations.
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'[\]<>+@]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lightweight, deterministic stemmer for English grievance text.
 * Normalizes common inflectional suffixes (plurals, past tense, participles)
 * and canonicalizes common AICTE grievance terminology.
 */
export function stemToken(token: string): string {
  if (token.length <= 3) return token;

  // Common AICTE grievance synonyms / equivalences
  if (token === 'unauthorized' || token === 'unapproved') return 'unapprov';
  if (token === 'allegation' || token === 'allegations') return 'alleg';
  if (token === 'irregularity' || token === 'irregularities') return 'irregular';

  // Suffix rules for inflection normalization
  if (token.endsWith('ied') && token.length > 4) {
    return token.slice(0, -3) + 'y';
  }
  if (token.endsWith('ies') && token.length > 4) {
    return token.slice(0, -3) + 'y';
  }
  if (token.endsWith('ing') && token.length > 5) {
    return token.slice(0, -3);
  }
  if (token.endsWith('ed') && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith('es') && token.length > 4) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

/**
 * Extracts unigrams, bigrams, and normalized stems from raw text,
 * filtering out administrative stopwords. Retains significant numeric codes/amounts.
 */
export function extractTokens(text: string): {
  unigrams: string[];
  bigrams: string[];
  stems: string[];
} {
  const normalized = normalizeText(text);
  if (!normalized) {
    return { unigrams: [], bigrams: [], stems: [] };
  }

  const rawWords = normalized.split(' ').filter((w) => w.length > 2);
  const unigrams: string[] = [];
  const stems: string[] = [];

  for (const word of rawWords) {
    // Exclude small numbers, but retain grievance amounts/numbers >= 4 digits (e.g. fee 45000)
    const isSmallNumber = /^\d+$/.test(word) && word.length < 4;
    if (!STOPWORDS.has(word) && !isSmallNumber) {
      unigrams.push(word);
      stems.push(stemToken(word));
    }
  }

  const bigrams: string[] = [];
  for (let i = 0; i < unigrams.length - 1; i++) {
    bigrams.push(`${unigrams[i]} ${unigrams[i + 1]}`);
  }

  return { unigrams, bigrams, stems };
}

/**
 * Computes Jaccard Similarity between two sets of strings.
 * J(A, B) = |A ∩ B| / |A ∪ B|
 */
export function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  return unionSize === 0 ? 0 : intersectionCount / unionSize;
}

/**
 * Computes Cosine Similarity between term frequency maps.
 */
export function calculateCosineSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  const freqA = new Map<string, number>();
  const freqB = new Map<string, number>();

  for (const t of tokensA) freqA.set(t, (freqA.get(t) ?? 0) + 1);
  for (const t of tokensB) freqB.set(t, (freqB.get(t) ?? 0) + 1);

  let dotProduct = 0;
  for (const [term, countA] of freqA.entries()) {
    const countB = freqB.get(term);
    if (countB) {
      dotProduct += countA * countB;
    }
  }

  let magA = 0;
  for (const count of freqA.values()) magA += count * count;

  let magB = 0;
  for (const count of freqB.values()) magB += count * count;

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Extracts shared keywords and key bigram phrases between two complaint texts.
 */
export function extractSharedKeywords(textA: string, textB: string): string[] {
  const tokensA = extractTokens(textA);
  const tokensB = extractTokens(textB);

  const sharedBigrams = new Set<string>();
  const setBigramsB = new Set(tokensB.bigrams);
  for (const bg of tokensA.bigrams) {
    if (setBigramsB.has(bg)) {
      sharedBigrams.add(bg);
    }
  }

  const sharedUnigrams = new Set<string>();
  const setUnigramsB = new Set(tokensB.unigrams);
  for (const ug of tokensA.unigrams) {
    if (setUnigramsB.has(ug)) {
      // If unigram is already covered by a shared bigram, avoid redundant repetition
      const coveredInBigram = Array.from(sharedBigrams).some((bg) => bg.includes(ug));
      if (!coveredInBigram) {
        sharedUnigrams.add(ug);
      }
    }
  }

  return [...Array.from(sharedBigrams), ...Array.from(sharedUnigrams)].slice(0, 8);
}
