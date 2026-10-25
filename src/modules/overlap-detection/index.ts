/**
 * Explainable Overlap Detection Engine for AICTE Complaints
 * Problem Statement ID: SIH 26264
 *
 * Provides a pure deterministic matching engine, text normalization and token-based similarity,
 * institution identity matching (AICTE Permanent ID priority with fallback), temporal proximity decay,
 * and database persistence service for human reviewable candidates.
 */

export * from './schema';
export * from './tokenizer';
export * from './institution-matcher';
export * from './temporal';
export * from './engine';
export * from './service';
