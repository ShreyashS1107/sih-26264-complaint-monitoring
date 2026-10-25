# High-Level System Architecture

**Project:** Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells  
**Problem Statement ID:** SIH 26264  
**Team:** Matrix Maya

---

## 1. Architectural Philosophy

The system is designed to provide AICTE with an intelligent, cross-bureau monitoring platform that breaks information silos without disrupting existing administrative hierarchies. Rather than replacing bureau-specific grievance mechanisms, the platform acts as an **intelligence and coordination layer** across all AICTE cells.

> [!IMPORTANT]
> **Advisory Overlap Principle:** All overlap candidate detections produced by the automated engine are treated strictly as **recommendations for official human review**, never as automatically confirmed duplicate cases or auto-merged files. Human oversight and final bureau discretion remain paramount.

---

## 2. End-to-End Information Pipeline

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           1. Case Ingestion                            │
  │   Approval Bureau | Grievance Redressal | Vigilance | Regional Cells   │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │               2. Institution Identity Resolution Engine                │
  │     Primary: AICTE Permanent ID | Fallback: Name & Location Fuzzy      │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                 3. Unified Complaint & History Store                   │
  │          PostgreSQL Database (Structured Data & Case Timeline)         │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │              4. Cross-Bureau Overlap Candidate Detection               │
  │       Institutional Filtering + Temporal Window + Multi-Factor Match   │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │               5. Explainable Overlap Scoring & Evidence                │
  │     Evidence Breakdown: Subject Similarity, Temporal Proximity, Parties │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                 6. Human Review & Coordination Alerts                  │
  │      Inter-Bureau Advisory Notifications & Dual-Review Workflows       │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │              7. Status Synchronization & Immutable Audit               │
  │         Chronological Audit Trail & Bureau Status Propagation          │
  └───────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │            8. Analytics, Role-Based Access & Data Governance           │
  │      RBAC Controls | PII Masking | Leadership Dashboard & Reports      │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Architectural Components

### 3.1. Complaint Intake from Bureau Sources

- Ingests structured complaint payloads across multiple sources (Approval Bureau, Anti-Ragging Cell, Faculty/Staff Grievance Cell, Vigilance Bureau, and Regional Directorates).
- Validates data formats using strict Zod schemas.
- Assigns a unified Case Tracking Identifier while retaining original bureau reference numbers.

### 3.2. Canonical Institution Identity Resolution

- Uses the **AICTE Permanent Institute ID** as the primary canonical anchor.
- Handles edge cases where Permanent IDs are missing or misentered using an institution resolution pipeline:
  - Exact match on AICTE Permanent ID.
  - Secondary verification via registered AISHE code or state affiliation.
  - Fallback phonetic and normalized string distance on institution name, district, and state.
- Flags uncertain identity matches for manual bureau confirmation before downstream processing.

### 3.3. Case History & Timeline Store

- Stores the complete lifecycle of each grievance in a relational PostgreSQL schema.
- Tracks stages: `Submitted` → `Under Preliminary Review` → `Cross-Bureau Overlap Detected` → `Inquiry Underway` → `Resolved` → `Closed`.
- Maintains associated evidentiary documents, case notes, and historical rulings.

### 3.4. Cross-Bureau Overlap Candidate Detection

- Employs an independent, modular matching pipeline (`src/modules/overlap-detection/`) that operates decoupled from presentation layers.
- Filters candidate pools by institution identity and active temporal windows (e.g., active within 180 days).
- Evaluates similarities across multiple independent axes:
  1. **Subject Matter & Allegation Similarity:** Keyword extraction, TF-IDF lexical matching, and semantic embeddings.
  2. **Complainant Linkage:** Pseudonymized matching on complainant indicators (masked for privacy).
  3. **Target Parties:** Specific department, faculty, or leadership identified in the complaint.
  4. **Temporal Proximity:** Frequency of similar complaints lodged within close succession.

### 3.5. Explainable Overlap Scoring & Evidence

- Avoids opaque black-box scores.
- Generates a transparent, weighted confidence score accompanied by an **Evidence Card**:
  - _Example Evidence:_ "88% match: Same institution (AICTE ID: 1-12345678), 92% subject similarity ('unapproved fee hike and withholding marksheets'), submitted within 14 days across Approval Bureau and Grievance Cell."
- Distinguishes between:
  - **Direct Duplicates:** Same complainant, same issue submitted across multiple portals.
  - **Coordinated Filings:** Multiple complainants raising identical grievances against an institution.
  - **Symptomatic Clusters:** Multiple distinct issues pointing to systemic administrative non-compliance.

### 3.6. Human Review and Coordination Alerts

- Surfaces advisories directly within the bureau officer's dashboard.
- Enables officers to trigger a **Joint Bureau Review** or cross-bureau memo.
- Supports case tagging without forcing automated merges:
  - `Independent Case` (False positive or distinct complaint).
  - `Coordinated Review` (Joint inquiry with other bureau).
  - `Reference Link` (Related background history).

### 3.7. Status Updates, Audit History, and Reporting

- Append-only audit log records every interaction:
  - Who viewed the case.
  - What overlap recommendations were generated.
  - What action or dismissal was decided by which officer.
- Cross-bureau status updates ensure Bureau A is informed if Bureau B closes a coordinated case or issues an order.

### 3.8. Role-Based Access & Data Governance

- Strict Role-Based Access Control (RBAC):
  - **Bureau Case Officer:** Full access to their bureau's cases, view-only advisory summary of external overlapping cases.
  - **Bureau Head / Cell Coordinator:** Authority to initiate joint reviews and access inter-bureau records.
  - **AICTE Central Executive / Super Admin:** Macro-level oversight, policy reporting, system configuration.
- Privacy compliance: PII masking of student and whistleblower information to prevent retaliatory disclosure.
