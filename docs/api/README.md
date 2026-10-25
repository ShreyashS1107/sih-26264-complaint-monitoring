# SIH 26264 Backend API Documentation (v1)

**System:** Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells  
**Problem Statement ID:** SIH 26264  
**Base URL:** `/api/v1`  
**Current Status:** Integration-Ready Implementation

---

## 1. Response Envelope & Conventions

All endpoints adhere to a standardized JSON response envelope. The client can always inspect `success: boolean` to determine if the request succeeded.

### 1.1. Success Envelope (`200 OK` / `201 Created`)

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-10-25T13:45:00.000Z",
    "requestId": "req_550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 1.2. Error Envelope (`4xx` / `5xx`)

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid complaint data provided.",
    "details": {
      "fieldErrors": {
        "complaintNumber": ["Expected format CMP-YYYY-XXXXX (e.g., CMP-2026-0001)"]
      }
    }
  },
  "meta": {
    "timestamp": "2026-10-25T13:45:00.000Z",
    "requestId": "req_550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## 2. Authentication & Authorization Model

### 2.1. Security Architecture
- **Server-Side Identity:** Identity is resolved securely on the server via `src/lib/auth.ts`.
- **Security Invariant:** Client-supplied badge numbers, officer IDs, roles, or spoofable HTTP headers (`X-Officer-Badge`, `X-Officer-ID`) are **never** trusted as identity.
- **Fail-Closed Gate:** Because no external identity provider (NextAuth, Keycloak SSO, signed JWT) is configured in the environment yet, `resolveAuthenticatedOfficer(request)` returns `null` by default. **Protected write endpoints fail-closed with HTTP `401 Unauthorized`.**
- **Bureau Authorization:** When authenticated, non-admin officers can only ingest complaints for their assigned bureau (`officer.bureauId === input.bureauId`), update complaints within their bureau, and review overlaps that involve their bureau. Central administrators (`CENTRAL_ADMIN`) can operate across all bureaus.

### 2.2. Access Matrix
- **Public Read Endpoints (No Auth Required for Frontend Development):**
  - `GET /api/v1/health`
  - `GET /api/v1/complaints`
  - `GET /api/v1/complaints/:id`
  - `GET /api/v1/complaints/:id/overlaps`
  - `GET /api/v1/complaints/:id/audit`
  - `GET /api/v1/overlap-candidates`
  - `GET /api/v1/institutions`
  - `GET /api/v1/institutions/:id`
  - `GET /api/v1/dashboard/summary`
  - `GET /api/v1/audit`
- **Protected Write Endpoints (Fail-Closed until Auth Provider Configured):**
  - `POST /api/v1/complaints`
  - `PATCH /api/v1/complaints/:id`
  - `POST /api/v1/overlap-candidates/:id/review`

---

## 3. Endpoints Reference

### 3.1. Health & Readiness

#### `GET /api/v1/health`
Verifies database connectivity and operational readiness.

- **Query Parameters:** None
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "status": "healthy",
      "database": "connected",
      "uptimeSeconds": 1420
    },
    "error": null,
    "meta": { "timestamp": "...", "requestId": "..." }
  }
  ```

---

### 3.2. Complaints Ingestion & Management

#### `GET /api/v1/complaints`
Lists complaints with multi-parameter filtering, search, pagination, and calculated overlap counts.

- **Query Parameters:**
  - `page` (integer, default: `1`, min: `1`)
  - `limit` (integer, default: `20`, min: `1`, max: `100`)
  - `bureauId` (string, max: 100) — Filter by originating AICTE bureau ID.
  - `institutionId` (string, max: 100) — Filter by institution ID.
  - `status` (enum: `SUBMITTED`, `UNDER_PRELIMINARY_REVIEW`, `UNDER_INQUIRY`, `COORDINATED_REVIEW`, `RESOLVED`, `CLOSED`, `DISMISSED`)
  - `priority` (enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `category` (enum: `FEE_ANOMALY`, `INFRASTRUCTURE_DEFICIT`, `FACULTY_NON_COMPLIANCE`, `HARASSMENT_RAGGING`, `ADMISSION_MALPRACTICE`, `UNAPPROVED_PROGRAM`, `OTHER`)
  - `search` (string, max: 100) — Case-insensitive search across `complaintNumber`, `subject`, and `originalBureauRef`.
  - `sortBy` (enum: `createdAt`, `updatedAt`, `priority`, `status`, `complaintNumber`, default: `createdAt`)
  - `sortOrder` (enum: `asc`, `desc`, default: `desc`)
  - `startDate` / `endDate` (ISO 8601 strings, e.g. `2026-01-01T00:00:00Z`)
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "complaints": [
        {
          "id": "cmvntrwxe000buphoiryjbx3k",
          "complaintNumber": "CMP-2026-0001",
          "originalBureauRef": "APP/2026/G-881",
          "institutionId": "cmvntrwxa0007uphoxd5n8v5w",
          "bureauId": "cmvntrwxb0008upho9q407421",
          "assignedOfficerId": "cmvntrwxc0009upho2d376p65",
          "subject": "Discrepancy in sanctioned student intake for B.Tech Computer Science program",
          "description": "The institution allegedly admitted 180 students against an approved AICTE intake quota of 120 students.",
          "category": "UNAPPROVED_PROGRAM",
          "priority": "HIGH",
          "status": "UNDER_INQUIRY",
          "incidentDate": null,
          "complainantType": "CITIZEN",
          "complainantMaskedId": "CIT-***-4410",
          "resolvedAt": null,
          "createdAt": "2026-02-01T10:00:00.000Z",
          "updatedAt": "2026-02-01T10:00:00.000Z",
          "institution": {
            "id": "cmvntrwxa0007uphoxd5n8v5w",
            "permanentId": "1-10098765",
            "name": "Matrix Institute of Technology (Synthetic Sample)",
            "state": "Maharashtra",
            "district": "Pune"
          },
          "bureau": {
            "id": "cmvntrwxb0008upho9q407421",
            "code": "APPROVAL_BUREAU",
            "name": "Approval Bureau"
          },
          "assignedOfficer": {
            "id": "cmvntrwxc0009upho2d376p65",
            "badgeNumber": "OFF-AICTE-001",
            "name": "Case Officer Alpha (Demo)",
            "email": "officer.alpha@demo.aicte.internal",
            "role": "CASE_OFFICER",
            "bureauId": "cmvntrwxb0008upho9q407421"
          },
          "overlapCount": 1
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 5,
        "totalPages": 1
      }
    },
    "error": null,
    "meta": { "timestamp": "...", "requestId": "..." }
  }
  ```

---

#### `POST /api/v1/complaints`
Ingests a new complaint, creates an `INGEST_COMPLAINT` audit log, and triggers cross-bureau overlap detection.

- **Security:** Protected. Fails closed with `401 Unauthorized` until server authentication is configured.
- **Request Body:**
  ```json
  {
    "complaintNumber": "CMP-2026-0009",
    "originalBureauRef": "SGRC/2026/REF-442",
    "institutionId": "cmvntrwxa0007uphoxd5n8v5w",
    "bureauId": "cmvntrwxb0008upho9q407421",
    "assignedOfficerId": "cmvntrwxc0009upho2d376p65",
    "subject": "Unauthorized additional laboratory fees levied on second-year students",
    "description": "College administration demanded an unapproved cash development fee of 40,000 INR before issuing hall tickets.",
    "category": "FEE_ANOMALY",
    "priority": "HIGH",
    "status": "SUBMITTED",
    "complainantType": "STUDENT",
    "complainantMaskedId": "STU-***-8822"
  }
  ```
- **Validation Rules:**
  - `complaintNumber`: Regex `/^CMP-\d{4}-\d{4,6}$/` (e.g., `CMP-2026-0001`).
  - `subject`: 5 to 255 characters.
  - `description`: Minimum 10 characters.
  - `institutionId`, `bureauId`: Must exist in PostgreSQL.
- **Success Response (`201 Created`):**
  ```json
  {
    "success": true,
    "data": {
      "complaint": { ... },
      "overlaps": {
        "evaluatedPoolSize": 14,
        "detectedCandidateCount": 1,
        "candidates": [ ... ]
      }
    },
    "error": null,
    "meta": { "timestamp": "...", "requestId": "..." }
  }
  ```
- **Error Codes:**
  - `400 INVALID_JSON` — Malformed JSON body.
  - `400 VALIDATION_ERROR` — Schema violations (returned in `details.fieldErrors`).
  - `401 UNAUTHORIZED` — No authenticated officer session resolved.
  - `403 FORBIDDEN` — Officer role not authorized to ingest for this bureau.
  - `404 NOT_FOUND` — Referenced institution or bureau not found.
  - `409 CONFLICT` — Duplicate `complaintNumber`.
  - `500 OVERLAP_ANALYSIS_FAILED` — Complaint was saved, but overlap scan failed.

---

#### `GET /api/v1/complaints/:id`
Retrieves a full complaint record by its primary key `id` or tracking `complaintNumber`.

- **Path Parameters:** `id` (string) — Primary CUID or tracking complaintNumber (`CMP-2026-0001`).
- **Includes:** Institution details, bureau details, assigned officer, timeline `caseActions`, and detected `overlaps.candidates`.
- **Error Codes:**
  - `400 INVALID_COMPLAINT_ID`
  - `404 COMPLAINT_NOT_FOUND`

---

#### `PATCH /api/v1/complaints/:id`
Updates a complaint's lifecycle status, priority, category, or officer assignment.

- **Security:** Protected. Fails closed with `401 Unauthorized` until server authentication is configured.
- **Path Parameters:** `id` (string)
- **Request Body:**
  ```json
  {
    "status": "UNDER_PRELIMINARY_REVIEW",
    "priority": "HIGH",
    "notes": "Assigned to the regional inspection cell for preliminary document verification."
  }
  ```
- **Permitted Status State Machine Transitions:**
  - `SUBMITTED` &rarr; `UNDER_PRELIMINARY_REVIEW`, `DISMISSED`
  - `UNDER_PRELIMINARY_REVIEW` &rarr; `UNDER_INQUIRY`, `COORDINATED_REVIEW`, `DISMISSED`
  - `UNDER_INQUIRY` &rarr; `COORDINATED_REVIEW`, `RESOLVED`, `DISMISSED`
  - `COORDINATED_REVIEW` &rarr; `UNDER_INQUIRY`, `RESOLVED`, `DISMISSED`
  - `RESOLVED` &rarr; `CLOSED`, `UNDER_INQUIRY`
  - `CLOSED` &rarr; `UNDER_PRELIMINARY_REVIEW`, `UNDER_INQUIRY`
  - `DISMISSED` &rarr; `UNDER_PRELIMINARY_REVIEW`
- **Error Codes:**
  - `400 INVALID_STATUS_TRANSITION` — Transition is not allowed by business rules.
  - `400 NO_CHANGES_REQUESTED` — Note provided without any field modification.
  - `403 FORBIDDEN` — Officer not assigned to this bureau.
  - `404 COMPLAINT_NOT_FOUND` / `OFFICER_NOT_FOUND`

---

#### `GET /api/v1/complaints/:id/overlaps`
Retrieves detected overlap candidates specifically associated with this complaint, ordered by composite `overallScore desc`.

---

#### `GET /api/v1/complaints/:id/audit`
Retrieves chronological audit trail for a specific complaint.

---

### 3.3. Overlap Detection & Review

#### `GET /api/v1/overlap-candidates`
Lists cross-bureau overlap candidates with match scores and transparent evidence signals.

- **Query Parameters:**
  - `page` (integer, default: `1`)
  - `limit` (integer, default: `20`, max: `100`)
  - `status` (enum: `PENDING_REVIEW`, `FLAGGED_JOINT_REVIEW`, `CONFIRMED_OVERLAP`, `DISMISSED_INDEPENDENT`)
  - `minScore` (float, `0.0` to `1.0`, e.g. `0.75`)
  - `institutionId` (string)
  - `bureauId` (string) — Matches candidates where either the primary or secondary complaint belongs to this bureau.
  - `sortBy` (enum: `overallScore`, `createdAt`, `updatedAt`, default: `overallScore`)
  - `sortOrder` (enum: `asc`, `desc`, default: `desc`)
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "candidates": [
        {
          "id": "cand_98124",
          "overallScore": 0.85,
          "entityScore": 1.0,
          "subjectScore": 0.82,
          "complainantScore": 0.6,
          "temporalScore": 0.95,
          "reviewStatus": "PENDING_REVIEW",
          "matchingSignals": {
            "commonKeywords": ["unapproved fee", "hall ticket", "refund"],
            "daysApart": 8,
            "involvedBureaus": ["STUDENT_GRIEVANCE_CELL", "VIGILANCE_BUREAU"],
            "explanation": "Both complaints report unauthorized fee levies at Matrix Institute within 8 days of each other."
          },
          "primaryComplaint": {
            "id": "cmp_002",
            "complaintNumber": "CMP-2026-0002",
            "subject": "...",
            "bureau": { "code": "STUDENT_GRIEVANCE_CELL", "name": "Student Grievance Redressal Cell" }
          },
          "candidateComplaint": {
            "id": "cmp_003",
            "complaintNumber": "CMP-2026-0003",
            "subject": "...",
            "bureau": { "code": "VIGILANCE_BUREAU", "name": "Vigilance Bureau" }
          },
          "institution": {
            "permanentId": "1-10098765",
            "name": "Matrix Institute of Technology (Synthetic Sample)"
          }
        }
      ],
      "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
    }
  }
  ```

---

#### `POST /api/v1/overlap-candidates/:id/review`
Submits a human officer's official review decision for an overlap candidate.

- **Security:** Protected. Fails closed with `401 Unauthorized` until server authentication is configured.
- **CRITICAL INVARIANT:** **Complaints are NEVER automatically merged or deleted.** Both complaints remain distinct master records in their respective bureaus.
- **Request Body:**
  ```json
  {
    "decision": "CONFIRMED_OVERLAP",
    "notes": "Verified duplicate complaint across bureaus regarding the same laboratory fee incident. Initiating coordinated review."
  }
  ```
- **Allowed Decisions:**
  - `CONFIRMED_OVERLAP` — Confirms both complaints report the same incident (adds `OVERLAP_LINKED` case action to both complaints).
  - `FLAGGED_JOINT_REVIEW` — Recommends multi-bureau coordinated investigation (adds `OVERLAP_LINKED` case action to both complaints).
  - `DISMISSED_INDEPENDENT` — Officer determined complaints are distinct incidents (adds `OVERLAP_DISMISSED` case action to both complaints).
- **Error Codes:**
  - `401 UNAUTHORIZED`
  - `403 FORBIDDEN` — Officer not assigned to either involved bureau.
  - `404 OVERLAP_CANDIDATE_NOT_FOUND`

---

### 3.4. Institutions API

#### `GET /api/v1/institutions`
Lists institutions with complaint and overlap candidate counts.

- **Query Parameters:**
  - `page` (integer, default: `1`)
  - `limit` (integer, default: `20`, max: `100`)
  - `search` (string, max: 100) — Matches `name`, `permanentId`, or `district`.
  - `state` (string)
  - `district` (string)
  - `institutionType` (string)
  - `approvalStatus` (`APPROVED`, `UNDER_SCRUTINY`, `PROVISIONAL`, `WITHDRAWN`)

#### `GET /api/v1/institutions/:id`
Retrieves institutional profile by cuid `id` or AICTE Permanent ID (e.g. `1-10098765`), including its 10 most recent complaints.

---

### 3.5. Executive Dashboard & Metrics

#### `GET /api/v1/dashboard/summary`
Aggregated statistics for high-level dashboard cards and visual charts.

- **Response Payload:**
  ```json
  {
    "success": true,
    "data": {
      "overview": {
        "totalComplaints": 5,
        "totalOverlapCandidates": 1,
        "pendingReviewCount": 1,
        "confirmedOverlapCount": 0,
        "flaggedJointReviewCount": 0
      },
      "complaintsByStatus": {
        "SUBMITTED": 1,
        "UNDER_INQUIRY": 2,
        "COORDINATED_REVIEW": 1,
        "RESOLVED": 1
      },
      "complaintsByPriority": {
        "CRITICAL": 1,
        "HIGH": 3,
        "MEDIUM": 1
      },
      "complaintsByCategory": {
        "UNAPPROVED_PROGRAM": 1,
        "FEE_ANOMALY": 3,
        "HARASSMENT_RAGGING": 1
      },
      "complaintsByBureau": [
        { "bureauCode": "APPROVAL_BUREAU", "bureauName": "Approval Bureau", "complaintCount": 1 },
        { "bureauCode": "STUDENT_GRIEVANCE_CELL", "bureauName": "Student Grievance Redressal Cell", "complaintCount": 2 },
        { "bureauCode": "VIGILANCE_BUREAU", "bureauName": "Vigilance Bureau", "complaintCount": 1 }
      ],
      "overlapMetrics": {
        "totalCandidates": 1,
        "statusBreakdown": {
          "PENDING_REVIEW": 1,
          "FLAGGED_JOINT_REVIEW": 0,
          "CONFIRMED_OVERLAP": 0,
          "DISMISSED_INDEPENDENT": 0
        }
      },
      "topInstitutions": [
        {
          "permanentId": "1-10098765",
          "name": "Matrix Institute of Technology (Synthetic Sample)",
          "complaintCount": 3,
          "overlapCandidateCount": 1
        }
      ]
    }
  }
  ```

---

### 3.6. Audit Trail API

#### `GET /api/v1/audit`
Queries operational audit history with pagination and entity filtering.

- **Query Parameters:**
  - `page` (integer, default: `1`)
  - `limit` (integer, default: `50`, max: `100`)
  - `entityType` (string, e.g. `COMPLAINT`, `OVERLAP_CANDIDATE`, `INSTITUTION`)
  - `entityId` (string)
  - `bureauId` (string)
  - `action` (string, e.g. `INGEST_COMPLAINT`, `UPDATE_COMPLAINT`, `RECORD_OVERLAP_REVIEW`)
  - `actorId` (string)
- **Privacy Assurance:** Internal client IP addresses are omitted from public responses, and sensitive credentials are recursively redacted.

---

## 4. Frontend Integration Tips & Guidelines

1. **Checking Request Results:**
   Always inspect `response.data.success`. If `false`, read `response.data.error.code` and `response.data.error.message`.
2. **Handling 401 Unauthorized:**
   When testing write endpoints (`POST /api/v1/complaints`, `PATCH /api/v1/complaints/:id`, `POST /api/v1/overlap-candidates/:id/review`) before SSO is live, expect `401 Unauthorized` (`UNAUTHORIZED`). Display a clear modal or banner indicating that an authenticated officer session is required.
3. **Displaying Complainant Information:**
   Complaints contain `complainantMaskedId` (e.g. `STU-***-8822`) and `complainantType` (`STUDENT`, `CITIZEN`, etc.). For whistleblower and student safety, raw complainant identity is never stored or returned.
4. **Visualizing Overlap Candidates:**
   Use the `matchingSignals` JSON payload on overlap candidates to display explainable evidence in UI badges:
   - `commonKeywords`: shared topics (e.g. `["unapproved fee", "hall ticket"]`).
   - `daysApart`: temporal gap between filings.
   - `explanation`: engine's transparent summary.
5. **No Complaint Merging:**
   When confirming an overlap (`CONFIRMED_OVERLAP`), both complaints remain available in their respective bureau queues. The UI should link them as related cases rather than attempting to delete either one.
