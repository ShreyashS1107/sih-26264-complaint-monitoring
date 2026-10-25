/**
 * DEMONSTRATION DATA ONLY
 * -----------------------
 * Baseline system audit records demonstrating administrative traceability
 * across AICTE bureau actions and human adjudication decisions.
 */

import { AuditEvent } from "../types";

export const DEMO_AUDIT_LOGS: AuditEvent[] = [
  {
    id: "AUD-2026-901",
    complaintId: "AICTE-2026-8403",
    actor: "P. R. Sharma (Coordinator, Anti-Ragging Cell)",
    action: "Urgency Escalated",
    details: "Marked priority as Critical following receipt of corroborating medical report.",
    timestamp: "2026-10-18 16:45",
  },
  {
    id: "AUD-2026-902",
    complaintId: "AICTE-2026-8401",
    actor: "K. Venkatesh (Director, Approval Bureau)",
    action: "Show-Cause Notice Dispatched",
    details: "Formal statutory notice issued to Apex Institute of Advanced Technology under Sec 10(k).",
    timestamp: "2026-09-20 11:30",
  },
  {
    id: "AUD-2026-903",
    complaintId: "AICTE-2026-8405",
    actor: "Dr. S. Nair (Deputy Director, FDC)",
    action: "Overlap Adjudication Recorded",
    details: "Linked AICTE-2026-8405 and AICTE-2026-8406 as Related Cases for Joint Scrutiny.",
    timestamp: "2026-09-08 14:30",
  },
  {
    id: "AUD-2026-904",
    complaintId: "AICTE-2026-8408",
    actor: "M. K. Joshi (Ombudsman, Student Grievance)",
    action: "Case Resolved & Closed",
    details: "Full caution deposit refund of ₹80,000 confirmed; student acknowledged receipt of original certificates.",
    timestamp: "2026-08-10 17:00",
  },
  {
    id: "AUD-2026-905",
    complaintId: "AICTE-2026-8407",
    actor: "Apex Scrutiny Board (Northern Region)",
    action: "Hearing Scheduled",
    details: "Institutional hearing scheduled for 2026-11-05 before standing appellate committee.",
    timestamp: "2026-08-01 10:00",
  },
];
