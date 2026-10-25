# Phase 3 Execution Record: Database Foundation & Relational Schema

**Project:** Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells  
**Problem Statement ID:** SIH 26264  
**Team:** Matrix Maya  
**Execution Date:** 2026-10-25  
**Current Phase:** Phase 3 — Database Foundation & Live Database Verification

---

## 1. Phase Objective

Design and implement a maintainable relational database foundation using PostgreSQL and Prisma ORM. Ensure that data modeling encapsulates canonical AICTE institution identity, bureau grievance ingestion, officer assignments (without unnecessary PII), complaint lifecycle history, explainable overlap candidate pairs, and governance audit trails. Verify the entire pipeline against a live local PostgreSQL instance.

---

## 2. Relational Schema Architecture & Design Rationale

### 2.1. Domain Models and Core Constraints

```
  ┌──────────────────────┐                  ┌──────────────────────┐
  │     Institution      │                  │        Bureau        │
  │  (AICTE Permanent ID)│                  │ (APPROVAL, VIGILANCE)│
  └──────────┬───────────┘                  └──────────┬───────────┘
             │ 1                                       │ 1
             │                                         │
             │           ┌──────────────────┐          │
             │           │     Officer      │◄─────────┘
             │           │ (No excessive PII│
             │           └─────────┬────────┘
             │                     │ 0..1 (Assigned)
             ▼ *                   ▼
  ┌─────────────────────────────────────────┐
  │                Complaint                │
  │  (Unified Tracking ID + Bureau Orig Ref)│
  └───────┬─────────────────────────┬───────┘
          │ 1                       │ 1
          ▼ *                       ▼ *
  ┌──────────────────┐      ┌──────────────────────────────┐
  │    CaseAction    │      │       OverlapCandidate       │
  │ (Audit Timeline) │      │ (Explainable Scores & Signals│
  └──────────────────┘      │  NEVER auto-merged or dropped│
                            └──────────────────────────────┘
```

1. **`Institution` (`prisma/schema.prisma`):**
   - **Primary Key:** `id` (`cuid()`).
   - **Canonical Identifier:** `permanentId` (`String @unique`, index on `permanentId`). Anchors complaints to official AICTE records while supporting fuzzy metadata matching as fallback.
   - **Profile Fields:** `name`, `state`, `district`, `address`, `pinCode`, `institutionType`, and `approvalStatus` (`APPROVED`, `UNDER_SCRUTINY`, `PROVISIONAL`, `WITHDRAWN`).
   - **Indices:** Compound index on `[state, district]`, index on `[name]`.

2. **`Bureau` (`prisma/schema.prisma`):**
   - **Primary Key:** `id` (`cuid()`).
   - **Unique Code:** `code` (`String @unique`, e.g., `APPROVAL_BUREAU`, `ANTI_RAGGING_CELL`, `STUDENT_GRIEVANCE_CELL`, `FACULTY_GRIEVANCE_CELL`, `VIGILANCE_BUREAU`, `REGIONAL_OFFICE`).
   - **Fields:** `name`, `description`, `isActive`.

3. **`Officer` (`prisma/schema.prisma`):**
   - **Design Rule:** Captures minimal necessary identity for role-based governance. No personal contact numbers, residential addresses, or non-work PII.
   - **Fields:** `badgeNumber` (`@unique`), `name`, `email` (`@unique`), `role` (`CASE_OFFICER`, `SENIOR_SCRUTINIZER`, `BUREAU_HEAD`, `CENTRAL_ADMIN`), `bureauId` (FK to Bureau with `onDelete: Restrict`).

4. **`Complaint` (`prisma/schema.prisma`):**
   - **Tracking Identifiers:**
     - `complaintNumber`: Canonical unified tracking number (e.g., `CMP-2026-0001`).
     - `originalBureauRef`: Preserves originating bureau reference (e.g., `APP/2026/G-881`, `SGRC/2026/FEE-114`).
   - **Relationships:**
     - Associated with `Institution` (`onDelete: Restrict`). Multiple complaints may belong to the same institution.
     - Associated with `Bureau` (`onDelete: Restrict`).
     - Optionally assigned to an `Officer` (`onDelete: SetNull`).
   - **Tracking Fields:** `subject`, `description`, `category` (enum), `priority` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `status` (`SUBMITTED`, `UNDER_PRELIMINARY_REVIEW`, `UNDER_INQUIRY`, `COORDINATED_REVIEW`, `RESOLVED`, `CLOSED`, `DISMISSED`).
   - **Privacy Protection:** `complainantMaskedId` (`String?`, e.g., `STU-***-8821`) protects whistleblowers and students from retaliation.

5. **`CaseAction` (`prisma/schema.prisma`):**
   - Append-only timeline entries recording status transitions, officer assignments, notes, and resolution actions.
   - Cascades on complaint deletion; preserves historical accountability.

6. **`OverlapCandidate` (`prisma/schema.prisma` & migration DDL):**
   - **Integrity Guarantee (No Self-Matches & No Reverse Duplicates):** Enforced via PostgreSQL check constraint `CHECK ("primaryComplaintId" < "candidateComplaintId")` and composite uniqueness `@@unique([primaryComplaintId, candidateComplaintId])`. This mathematically guarantees `primaryComplaintId != candidateComplaintId` and ensures each candidate pair exists only once in canonical alphabetical order.
   - **Score Bounds Guarantee:** Enforced via PostgreSQL check constraint `CHECK ("overallScore" >= 0.0 AND "overallScore" <= 1.0 AND "entityScore" >= 0.0 AND ...)`.
   - **Explainable Scores:**
     - `overallScore`: Float (0.0 to 1.0)
     - `entityScore`: Match on institution/department
     - `subjectScore`: Lexical/semantic similarity of grievance text
     - `complainantScore`: Masked party link score
     - `temporalScore`: Filing proximity score
   - **Matching Signals:** JSON payload capturing transparent evidence (common keywords, day delta, involved bureaus, human-readable explanation).
   - **Review Workflow:** `reviewStatus` (`PENDING_REVIEW`, `FLAGGED_JOINT_REVIEW`, `CONFIRMED_OVERLAP`, `DISMISSED_INDEPENDENT`), `reviewNotes`, `reviewedById`, `reviewedAt`.

7. **`AuditLog` (`prisma/schema.prisma`):**
   - Immutable audit logging for case creation, status changes, and cross-bureau review actions with actor attribution and timestamp indexing.

---

## 3. Database Deliverables Created

1. **`prisma/schema.prisma`:** Relational schema definition for PostgreSQL with 7 models and 8 enums.
2. **`prisma/migrations/20261025000000_init/migration.sql`:** DDL migration script with table creation, enums, indices, foreign keys, and PostgreSQL check constraints.
3. **`prisma/migrations/migration_lock.toml`:** Migration lock file specifying the PostgreSQL provider.
4. **`prisma/seed.ts`:** Repeatable, idempotent seed script populating synthetic bureaus, officers, institutions, complaints, case actions, and an explainable overlap candidate pair.
5. **`src/server/db.ts`:** Production-grade Next.js Prisma client singleton.
6. **Zod Validation Schemas:**
   - `src/modules/institutions/schema.ts` (`createInstitutionSchema`)
   - `src/modules/complaints/schema.ts` (`createComplaintSchema`, `updateComplaintStatusSchema`)
   - `src/modules/overlap-detection/schema.ts` (`overlapCandidateSchema`, `overlapCandidateRecordSchema`, `createCanonicalComplaintPair`, `aictePermanentIdSchema`)
7. **Test Suites:**
   - `tests/unit/institution-schema.test.ts` (4 unit tests)
   - `tests/unit/complaint-schema.test.ts` (4 unit tests)
   - `tests/unit/overlap-detection.test.ts` (10 unit tests)
   - `tests/integration/database.test.ts` (5 integration tests running against live PostgreSQL)

---

## 4. Live Database Verification Results

The local database was configured and verified against PostgreSQL 18.6:

1. **Database Creation:** Created database `sih26264_dev` on local PostgreSQL server.
2. **Migration Deployment:** Applied `20261025000000_init` via `npx prisma migrate deploy` creating 8 tables (`Institution`, `Bureau`, `Officer`, `Complaint`, `CaseAction`, `OverlapCandidate`, `AuditLog`, `_prisma_migrations`).
3. **Check Constraints Verified:** Inspected `pg_constraint` confirming `OverlapCandidate_canonical_order` (`primaryComplaintId < candidateComplaintId`) and `OverlapCandidate_score_bounds` active in PostgreSQL.
4. **Initial Seed Execution:** Seeded database with synthetic demo data:
   - 5 Bureaus
   - 3 Officers
   - 3 Institutions
   - 5 Complaints
   - 1 CaseAction
   - 1 OverlapCandidate
   - 1 AuditLog
5. **Seed Idempotency Verified:** Re-ran `npm run db:seed` a second time; row counts remained unchanged, proving 100% idempotency without duplicate records.
6. **Check Constraint Rejection Verified:** Live integration tests verified that attempting to insert a self-match or a score > 1.0 is rejected by PostgreSQL with constraint violation error code `23514`.

---

## 5. Regression Check Summary

All checks executed locally and passed with zero errors:

| Check                        | Command                | Result                                                                |
| :--------------------------- | :--------------------- | :-------------------------------------------------------------------- |
| **Prisma Schema Validation** | `npx prisma validate`  | Schema is valid                                                       |
| **Prisma Client Generation** | `npx prisma generate`  | Generated Prisma Client v6.4.0                                        |
| **Type Check**               | `npm run typecheck`    | 0 errors (strict mode enabled)                                        |
| **ESLint**                   | `npm run lint`         | 0 errors, 0 warnings                                                  |
| **Test Suite**               | `npm test`             | **23/23 tests passed** across 4 test files                            |
| **Formatting**               | `npm run format:check` | All files match Prettier code style                                   |
| **Production Build**         | `npm run build`        | Next.js Turbopack compiled and prerendered static routes successfully |

---

## 6. Teammate Setup Guide (Local Database Initialization)

Follow these steps to connect your local PostgreSQL database, apply migrations, and seed synthetic data:

### Step 1: Prepare Local PostgreSQL

Ensure PostgreSQL is running locally, or start an instance using Docker:

```bash
docker run --name sih-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sih26264_dev -p 5432:5432 -d postgres:16-alpine
```

### Step 2: Configure `.env`

Create a private `.env` file from the template (which is git-ignored):

```bash
cp .env.example .env
```

Update the `DATABASE_URL` line with your local credentials:

```env
DATABASE_URL="postgresql://postgres:<your-password>@localhost:5432/sih26264_dev?schema=public"
```

### Step 3: Run Database Migrations

Apply the initial schema migration to your database:

```bash
npm run db:migrate
# or: npx prisma migrate deploy
```

### Step 4: Seed Synthetic Demo Data

Populate the database with synthetic institutions, bureaus, and sample complaints:

```bash
npm run db:seed
# or: npx prisma db seed
```

### Step 5: Explore Data with Prisma Studio

Inspect the database tables interactively:

```bash
npm run db:studio
# Opens http://localhost:5555
```
