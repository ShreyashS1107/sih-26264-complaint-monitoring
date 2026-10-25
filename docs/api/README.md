# API Architecture & Route Specifications

**Project:** Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells  
**Problem Statement ID:** SIH 26264  
**Current Status:** Architectural Design Specification (Implementation scheduled for future phases)

---

## 1. Overview & Conventions

All internal and external API endpoints follow RESTful design principles and JSON payloads. In future implementation phases, these routes will be served via Next.js Route Handlers (`src/app/api/...`) and backed by Zod validation schemas.

### 1.1. Common Headers

- `Content-Type: application/json`
- `Authorization: Bearer <session-token>`
- `X-Bureau-ID: <bureau-identifier>`

### 1.2. Standard Response Envelope

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "timestamp": "2026-10-25T13:30:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 2. Planned API Route Groupings

### 2.1. Institutions API (`/api/v1/institutions`)

- `GET /api/v1/institutions` — Search and filter institutions by AICTE Permanent ID, name, state, or bureau affiliation.
- `GET /api/v1/institutions/:id` — Retrieve canonical institution record, bureau history, and compliance profile.
- `POST /api/v1/institutions/resolve` — Submit institution metadata for canonical ID resolution and confidence scoring.

### 2.2. Complaints Ingestion & Management (`/api/v1/complaints`)

- `POST /api/v1/complaints` — Ingest a new complaint from a bureau source with metadata and initial categorization.
- `GET /api/v1/complaints` — Query complaints with multi-parameter filtering (bureau, status, institution, date range).
- `GET /api/v1/complaints/:id` — Retrieve full complaint record, document references, and chronological timeline.
- `PATCH /api/v1/complaints/:id/status` — Update complaint status (e.g., inquiry ongoing, resolved, closed).

### 2.3. Overlap Detection Engine (`/api/v1/overlap-detection`)

- `POST /api/v1/overlap-detection/analyze` — Trigger overlap candidate detection for a newly ingested or updated complaint.
- `GET /api/v1/overlap-detection/candidates/:complaintId` — Retrieve list of candidate overlapping cases with explainable score breakdown.
- `POST /api/v1/overlap-detection/action` — Record an officer's review decision (link cases, dismiss overlap, flag joint review).

### 2.4. Bureau Coordination & Alerts (`/api/v1/alerts`)

- `GET /api/v1/alerts` — Retrieve active cross-bureau advisories and collision notices for the authenticated bureau.
- `POST /api/v1/alerts/:alertId/acknowledge` — Mark an advisory as acknowledged by the reviewing officer.
- `POST /api/v1/alerts/coordinate` — Send a formal coordination memo to another AICTE bureau.

### 2.5. Audit Trail (`/api/v1/audit`)

- `GET /api/v1/audit/complaints/:id` — Retrieve chronological audit log for a specific complaint.
- `GET /api/v1/audit/institutions/:id` — Retrieve historical institutional actions and bureau cross-checks.

### 2.6. Reports & Analytics (`/api/v1/reports`)

- `GET /api/v1/reports/bureau-summary` — Aggregated caseload and resolution metrics by bureau.
- `GET /api/v1/reports/overlap-insights` — Statistical distribution of overlap types and cross-bureau correlation rates.
- `GET /api/v1/reports/institutions/high-frequency` — Identify institutions with recurring multi-bureau filings.
