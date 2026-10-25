# Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells

**Problem Statement ID:** SIH 26264  
**Team Name:** Matrix Maya  
**Project Code:** `sih-26264-complaint-monitoring`  
**Current Phase:** Phase 1 — Project Scaffolding & Git Setup

---

## 1. Problem Overview

The All India Council for Technical Education (AICTE) receives complaints and grievances concerning affiliated institutions through multiple channels and distributed bureaus/cells (such as the Approval Bureau, Student Grievance Redressal / Anti-Ragging Cell, Faculty & Staff Grievance Cell, Vigilance Bureau, and Regional Offices).

Currently, these cases are often handled in bureau-specific silos. This leads to:

- Lack of centralized visibility into the holistic grievance profile of an institution.
- Duplicate or overlapping complaints submitted simultaneously or sequentially to different bureaus by the same or different parties.
- Parallel inquiries conducted without cross-bureau coordination, consuming redundant administrative effort.
- Delayed resolution and risk of conflicting administrative orders or approvals.

---

## 2. Main Objectives

1. **Unified Case Ingestion & Tracking:** Aggregate complaints across all AICTE bureaus into a synchronized monitoring workspace.
2. **Canonical Institution Identity Resolution:** Link diverse complaint submissions to an institution's canonical AICTE Permanent ID (with fallback matching when IDs are missing or ambiguous).
3. **Cross-Bureau Overlap Detection:** Identify potential multi-filings, thematic overlaps, and recurring grievances across bureaus using an explainable, multi-attribute scoring model.
4. **Bureau Coordination Alerts:** Provide non-intrusive advisories and alert triggers to bureau officers when potential overlap or coordinated cases are detected.
5. **Explainable Recommendations:** Present clear rationale and evidence breakdowns for detected overlaps (subject similarity, timeline proximity, party links) — ensuring human officers retain final decision authority.
6. **Immutable Audit Trail & Governance:** Ensure complete traceability, role-based access control (RBAC), and adherence to data protection standards.
7. **Executive Intelligence & Reporting:** Deliver actionable heatmaps, status breakdowns, and institutional compliance trends to leadership.

---

## 3. Planned Architecture & Modules

The project is structured into clean, decoupled modules:

- **`institutions` (`src/modules/institutions/`):** Manages AICTE institution profiles, canonical Permanent ID resolution, bureau approval records, and institutional directory lookups.
- **`complaints` (`src/modules/complaints/`):** Handles multi-bureau complaint intake, categorization, status lifecycle management, and case documentation.
- **`overlap-detection` (`src/modules/overlap-detection/`):** An isolated detection engine computing multi-factor similarity (entity, subject vector/lexical, complainant, temporal window) with explainable evidence output.
- **`alerts` (`src/modules/alerts/`):** Coordinates bureau-to-bureau notifications, collision warnings, and review invitations.
- **`audit` (`src/modules/audit/`):** Maintains append-only audit logs for actions, access, investigations, and case resolution.
- **`reports` (`src/modules/reports/`):** Aggregates analytics, bureau response latency, repeat offender indexing, and exportable regulatory briefs.

---

## 4. Intended Technology Stack

- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict mode enabled)
- **Frontend & Server Framework:** [Next.js](https://nextjs.org/) (App Router architecture)
- **Database & Storage:** [PostgreSQL](https://www.postgresql.org/)
- **ORM & Data Modeling:** [Prisma ORM](https://www.prisma.io/)
- **Schema & Input Validation:** [Zod](https://zod.dev/)
- **Testing Framework:** [Vitest](https://vitest.dev/) (Unit & Integration tests)
- **Styling:** Modern Vanilla CSS / Tailwind CSS (design system tokens)

_Note: In accordance with Phase 1 constraints, dependencies have not been installed yet to maintain a clean baseline._

---

## 5. Current Status & Setup Guide

### Current State (Phase 1)

- [x] Workspace directory scaffolding created.
- [x] Modular architecture and documentation established.
- [x] Environment configuration templates defined (`.env.example`).
- [x] Comprehensive `.gitignore` protecting secrets and build artifacts configured.
- [ ] Application runtime dependencies installed (Scheduled for Phase 2).
- [ ] Database schema and Prisma migrations initialized (Scheduled for Phase 3).
- [ ] Core overlap engine & UI components implemented (Scheduled for future phases).

> [!IMPORTANT]
> **No Application Features Active Yet:** In this phase, no live database connections, API endpoints, or user interfaces are active. All code artifacts represent architectural scaffolding.

### Future Setup Instructions (Phase 2+)

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd sih-26264
   ```

2. **Configure Environment Variables:**

   ```bash
   cp .env.example .env.local
   # Update .env.local with development database credentials
   ```

3. **Install Dependencies (Phase 2):**

   ```bash
   npm install
   ```

4. **Initialize Database (Phase 3):**

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Run Development Server:**
   ```bash
   npm run dev
   ```

---

## 6. Implementation Roadmap

- **Phase 1: Local Project Structure & Git Setup** _(Current)_
  - Modular directory layout, Git initialization, environment configs, documentation, remote repository linkage.
- **Phase 2: Core Tooling & Framework Initialization**
  - Next.js setup, TypeScript configuration, testing setup with Vitest, and linting/formatting rules.
- **Phase 3: Domain Data Modeling & Database Migration**
  - Prisma schema design (Institutions, Complaints, Bureaus, Overlaps, Audit Logs), PostgreSQL containerization, seed scripts.
- **Phase 4: Overlap Detection Engine Specification & Core Algorithms**
  - Tokenization, entity matching, TF-IDF / vector similarity, temporal proximity scoring, explainability matrix.
- **Phase 5: Bureau Dashboard UI & Role-Based Workflows**
  - Responsive case review interfaces, overlap inspection modal, coordination action triggers, role-based views.
- **Phase 6: Reporting, End-to-End Testing & Verification**
  - Comprehensive unit/integration suites, synthetic case stress testing, and demonstration workflows.

---

## 7. Synthetic Data Warning

> [!WARNING]
> **Synthetic Data Mandate:** Under no circumstances should actual institution records, real student/faculty grievances, personally identifiable information (PII), or live AICTE complaint files be introduced into this repository. All development, testing fixtures, and demonstrations will use strictly synthetic, simulated data.

---

## 8. Team Collaboration & Git Workflow

- All team members must adhere to our [Git Workflow Guidelines](docs/development/git-workflow.md).
- Create a dedicated feature branch for any task (e.g., `feat/overlap-scoring`, `docs/architecture-update`).
- Never commit secrets, API keys, credentials, or `.env` files.
- Pull recent changes from `main` before starting work to avoid merge conflicts.
- Code reviews and test verifications are mandatory before merging pull requests into `main`.
