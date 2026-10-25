# Phase 4 Execution Record: Explainable Overlap Detection Engine

**Project:** Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells  
**Problem Statement ID:** SIH 26264  
**Team:** Matrix Maya  
**Execution Date:** 2026-10-25  
**Current Phase:** Phase 4 — Explainable Overlap Detection Engine

---

## 1. Phase Objective

Implement a lightweight, deterministic, and explainable cross-bureau overlap detection engine in `src/modules/overlap-detection/`. The engine identifies potential duplicate, coordinated, or thematic complaint clusters filed across disparate AICTE bureaus (Approval Bureau, Student Grievance Redressal Cell, Vigilance Bureau, Anti-Ragging Cell, Faculty & Staff Grievance Cell, and Regional Offices).

### Key Design Mandates

1. **Pure & Deterministic:** The scoring and matching core is completely decoupled from database connections, allowing instant, reproducible unit testing in memory.
2. **AICTE Permanent ID Priority:** The verified AICTE Permanent Institute ID (`1-XXXXXXXX`) serves as the canonical institution identity signal. Name and geographic location similarity are used strictly as fallbacks when Permanent IDs are missing or unverified.
3. **Lexical Normalization & Stemming:** Custom administrative grievance tokenizer with stopword filtering, unigrams, compound bigrams, and inflectional suffix stemming (`ticket/tickets`, `fee/fees`, `levy/levies`, `unauthorized/unapproved`).
4. **Subject Relevance Gating:** Complaints concerning distinct matters at the same institution (e.g. hostel ragging vs. faculty 7th CPC salary delays) must never be falsely flagged as clusters or duplicates simply because of institutional identity or close filing timestamps. Temporal proximity is conditionally gated by substantive subject relevance.
5. **Explainability & Human In The Loop:** Candidate pairs provide structured matching signals (`commonKeywords`, `daysApart`, `involvedBureaus`, `entityMatchReason`, `temporalExplanation`, `explanation`, `recommendation`, `overlapType`, `severity`). Complaints are **never automatically merged, altered, or deleted**.

---

## 2. Multi-Attribute Scoring Architecture

The engine computes a composite overlap score $S_{\text{overall}} \in [0.0, 1.0]$ based on four explainable attribute dimensions:

$$ \begin{aligned}
S_{\text{overall}} &= w_{\text{entity}} \cdot S_{\text{entity}} + w_{\text{subject}} \cdot S_{\text{subject}} + w_{\text{temporal}} \cdot S_{\text{temporal\_eff}} + w_{\text{complainant}} \cdot S_{\text{complainant}}
\end{aligned}$$

### 2.1. Scoring Weights

| Attribute Dimension | Weight ($w$) | Metric & Technique | Rationale |
| :--- | :--- | :--- | :--- |
| **Institution Entity** ($S_{\text{entity}}$) | **0.35** | Exact AICTE ID match (1.0 vs 0.0); fallback composite name Levenshtein + token Jaccard + geographic state/district match. | Hard requirement: complaints concerning two separate institutions cannot be duplicates. |
| **Subject & Allegation** ($S_{\text{subject}}$) | **0.40** | Stemmed Cosine similarity on subject headlines (40%), full narrative (45%), and compound bigrams (15%), modified by category concordance. | Core semantic indicator of whether the underlying grievance describes the same grievance or incident. |
| **Temporal Proximity** ($S_{\text{temporal}}$) | **0.15** | Exponential decay $S(t) = e^{-\frac{\ln(2)}{90} \cdot \Delta t}$, gated by subject relevance $\min(1.0, S_{\text{subject}} / 0.30)$. | Captures coordinated campaigns and multi-portal filings while preventing unrelated cases from clustering. |
| **Complainant Linkage** ($S_{\text{complainant}}$) | **0.10** | Privacy-masked complainant ID exact match (1.0), complainant type match (0.5), or default (0.2). | Identifies direct re-filings vs. multi-party / collective student complaints. |

$$\sum w_i = 0.35 + 0.40 + 0.15 + 0.10 = 1.00$$

---

## 3. Detailed Component Architecture

### 3.1. Text Tokenizer & Lexical Normalizer (`tokenizer.ts`)
- **Normalization:** Lowercases text, strips administrative punctuation, and normalizes spacing.
- **Administrative Stopwords:** Filters common English stopwords and administrative boilerplate words (`'respectfully'`, `'grievance'`, `'complaint'`, `'submitted'`, `'alleged'`, `'council'`, etc.).
- **Significant Quantities:** Preserves critical grievance numerals $\ge 4$ digits (e.g. extortion fee amounts like `45000`).
- **Deterministic Stemmer:** Canonicalizes inflectional endings (`'s'`, `'es'`, `'ied'`, `'ies'`, `'ing'`, `'ed'`) and AICTE synonyms (`'unauthorized'` $\leftrightarrow$ `'unapproved'`, `'irregularities'` $\leftrightarrow$ `'irregular'`).
- **Metrics:** Cosine Similarity on term frequency vectors and Jaccard Similarity on token/bigram sets.

### 3.2. Institution Identity Resolution Engine (`institution-matcher.ts`)
- **Primary Rule (Canonical Match):**
  - If both entities have verified AICTE Permanent IDs:
    - $\text{id}_A = \text{id}_B \implies S_{\text{entity}} = 1.0$ (`EXACT_PERMANENT_ID`)
    - $\text{id}_A \neq \text{id}_B \implies S_{\text{entity}} = 0.0$ (`DIFFERENT_INSTITUTION`)
- **Fallback Rule (Missing or Unverified IDs):**
  - Checks state alignment: Different states $\implies S_{\text{entity}} = 0.05$ (`DIFFERENT_INSTITUTION`).
  - Evaluates location confidence: Same state = 0.7; same state + district = 1.0.
  - Extracts distinctive tokens by filtering generic educational terms (`'college'`, `'institute'`, `'engineering'`, `'technology'`, `'polytechnic'`, `'university'`).
  - Computes composite fallback: $S_{\text{fallback}} = 0.70 \cdot \text{nameSimilarity} + 0.30 \cdot \text{locationConfidence}$.

### 3.3. Temporal Proximity Scorer (`temporal.ts`)
- Computes absolute difference in calendar days $\Delta t = |t_A - t_B|$.
- Half-life model calibrated to AICTE academic/approval quarters ($t_{1/2} = 90$ days):
  - $\Delta t \le 14$ days: $S \approx 0.90 - 1.0$ (Simultaneous multi-portal filings)
  - $\Delta t \le 60$ days: $S \approx 0.65 - 0.90$ (Same academic term)
  - $\Delta t \le 180$ days: $S \approx 0.25 - 0.65$ (Same academic year)
  - $\Delta t > 365$ days: $S$ clamped at minimum 0.05.

### 3.4. Pure Deterministic Overlap Engine (`engine.ts`)
- **Mathematical Invariant:** Enforces canonical pair keying (`primaryComplaintId < candidateComplaintId`), mathematically eliminating duplicate reverse records (`B, A`) and self-comparisons (`A, A`).
- **Entity Gating:** If $S_{\text{entity}} < 0.25$, $S_{\text{overall}}$ immediately collapses to $\le 0.10$.
- **Subject Gating:** If $S_{\text{subject}} < 0.30$, effective temporal score scales linearly with subject score, guaranteeing $S_{\text{overall}} < 0.45$ for unrelated matters.
- **Classification & Recommendation Thresholds:**
  - $S_{\text{overall}} \ge 0.65 \land S_{\text{entity}} \ge 0.75 \land S_{\text{subject}} \ge 0.35$:
    - Same complainant $\implies$ `DIRECT_DUPLICATE` (`FLAG_FOR_JOINT_REVIEW`, `HIGH` severity).
    - Different complainants $\implies$ `COORDINATED_FILING` (`FLAG_FOR_JOINT_REVIEW`, `HIGH` severity).
  - $S_{\text{overall}} \ge 0.45 \land S_{\text{entity}} \ge 0.75 \land S_{\text{subject}} \ge 0.25$:
    - `SYMPTOMATIC_CLUSTER` (`MONITOR_SYMPTOMATIC_CLUSTER`, `MEDIUM` severity).
  - Otherwise:
    - `INDEPENDENT` (`INDEPENDENT_CASE`, `LOW` severity).

### 3.5. Persistence & Query Service (`service.ts`)
- `analyzeAndPersistOverlaps(targetComplaintId, options)`:
  - Fetches target complaint with institution and bureau relations.
  - Queries active candidate pool within a symmetric temporal window (`[-windowDays, +windowDays]`, default 365 days) with deterministic ordering (`createdAt desc, id asc`).
  - Limits pool to 200 complaints per scan, prioritizing the most recent filings with an unambiguous primary key tie-breaker.
  - Runs pure `scanForOverlapCandidates` using `OVERLAP_THRESHOLDS.MODERATE_CLUSTER` (`0.45`) as default threshold.
  - Validates results through Zod `overlapCandidateRecordSchema`.
  - Atomically updates PostgreSQL `OverlapCandidate` records inside Prisma `$transaction`:
    - **Concurrency-Safe Human Decision Preservation:** Candidate records are managed inside an atomic `$transaction` with PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) and a conditional update WHERE-clause. Similarity scores and matching evidence are always updated, but an officer's human review decisions (`CONFIRMED_OVERLAP`, `DISMISSED_INDEPENDENT`, `reviewedById`, `reviewedAt`, `reviewNotes`) cannot be overwritten even under concurrent rescoring.
    - **Zero Data Loss Guarantee:** Never updates, merges, or deletes any `Complaint` row.
    - **Non-Destructive Integration Testing:** Integration tests isolate mutations strictly to the specific candidate pair under test via snapshot capture and targeted restore hooks, ensuring zero interference with unrelated candidates or existing officer decisions.
- `getOverlapCandidatesForComplaint(complaintId)`:
  - Retrieves persisted candidates with full relation graphs (`primaryComplaint`, `candidateComplaint`, `bureau`, `institution`, `reviewedBy`).

---

## 4. Verification & Test Suite

The entire engine and service have been verified against both pure in-memory scenarios and the live PostgreSQL database (`sih26264_dev`).

### Test Coverage Summary: 59 / 59 Passing Tests

```
 ✓ tests/unit/institution-schema.test.ts (4 tests)
 ✓ tests/unit/complaint-schema.test.ts (4 tests)
 ✓ tests/unit/overlap-detection.test.ts (12 tests)
   ✓ AICTE Permanent Institute ID Validation (4 tests)
   ✓ Overlap Detection Candidate Schema & Integrity Rules (5 tests)
   ✓ Detailed Overlap Candidate Database Record Validation (3 tests)
 ✓ tests/unit/overlap-engine.test.ts (28 tests)
   ✓ Text Normalization and Lexical Tokenizer (8 tests)
   ✓ Institution Identity Resolution Engine (6 tests)
   ✓ Temporal Proximity Scorer (6 tests)
   ✓ Pure Explainable Overlap Engine Scenarios (7 tests)
   ✓ scanForOverlapCandidates Utility (1 test)
 ✓ tests/integration/database.test.ts (5 tests)
   ✓ PostgreSQL connection and seed verification
   ✓ OverlapCandidate canonical order DB constraint check
   ✓ OverlapCandidate score bounds DB constraint check
 ✓ tests/integration/overlap-service.test.ts (6 tests)
   ✓ analyzeAndPersistOverlaps persists valid reviewable records
   ✓ Non-destructive guarantee: complaints are never auto-merged, altered, or deleted
   ✓ Default threshold (0.45) retention between 0.45 and 0.50
   ✓ CONFIRMED_OVERLAP preservation across repeated rescoring
   ✓ DISMISSED_INDEPENDENT preservation across repeated rescoring
   ✓ Concurrency-safe human decision protection against concurrent automated rescoring
```

---

## 5. Artifacts and Source Structure

```
src/modules/overlap-detection/
├── engine.ts              # Pure deterministic evaluator, scoring formula, classifications
├── index.ts               # Barrel export for module public API
├── institution-matcher.ts # AICTE Permanent ID resolver & fuzzy name/location fallback
├── schema.ts              # Zod validation schemas and canonical pair ordering utility
├── service.ts             # Database persistence & relation queries
├── temporal.ts            # Half-life exponential decay temporal proximity scorer
└── tokenizer.ts           # Administrative text normalizer, stopword filter, and stemmer

tests/
├── unit/
│   ├── overlap-detection.test.ts # Schema, score bounds, and canonical ordering unit tests
│   └── overlap-engine.test.ts    # 24 pure engine scenario & normalization unit tests
└── integration/
    ├── database.test.ts          # Relational constraint & DB level check tests
    └── overlap-service.test.ts   # Live DB persistence, idempotency, & immutability tests
```

---

## 6. Verification Pipeline Results

All quality and regression checks passed cleanly:
- `npm run db:validate` -> Valid schema (`prisma/schema.prisma` is valid)
- `npm run typecheck` -> TypeScript `tsc --noEmit` clean (0 errors)
- `npm run lint` -> ESLint clean (0 errors, 0 warnings)
- `npm test` -> 50 / 50 Vitest tests passed across 6 test suites
- `npm run format:check` -> Prettier clean (All matched files use Prettier style)
- `npm run build` -> Next.js production build succeeded
$$
