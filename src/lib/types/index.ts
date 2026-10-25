/**
 * AICTE Institutional Complaint Intelligence - Domain Types
 * Strictly typed interfaces matching the approved institutional architecture.
 */

export type BureauType =
  | "Approval Bureau"
  | "Student Grievance Cell"
  | "Faculty Development Cell"
  | "Anti-Ragging Cell"
  | "Finance & Legal Cell";

export type ComplaintPriority = "Critical" | "High" | "Medium" | "Low";

export type ComplaintStatus =
  | "Under Scrutiny"
  | "Assigned to Bureau"
  | "Show-Cause Notice Issued"
  | "Institution Response Received"
  | "Hearing Scheduled"
  | "Resolved"
  | "Escalated";

export interface EvidenceDocument {
  id: string;
  name: string;
  fileSize: string;
  uploadDate: string;
  category: "Affidavit" | "Fee Receipt" | "Communication" | "Inspection Report" | "Audit Report";
}

export interface Complaint {
  id: string;
  title: string;
  institutionId: string;
  institutionName: string;
  region: string;
  state: string;
  bureau: BureauType;
  category: string;
  complainantType: "Student" | "Faculty" | "Parent" | "Anonymous" | "Whistleblower";
  filingDate: string;
  deadlineDate: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  description: string;
  allegations: string[];
  evidence: EvidenceDocument[];
  relatedCaseIds?: string[];
}

export type OverlapSignalType =
  | "Text Similarity"
  | "Same Institution ID"
  | "Identical Faculty Named"
  | "Contact Hash Match"
  | "Temporal Proximity";

export interface OverlapMatchingSignal {
  type: OverlapSignalType;
  detail: string;
}

export type OverlapReviewStatus = "Pending" | "Linked" | "Independent" | "Dismissed";

export interface OverlapCandidate {
  id: string;
  sourceComplaintId: string;
  targetComplaintId: string;
  signalScore: number; // Algorithmic indicator 0-100; NOT an automated decision
  matchingSignals: OverlapMatchingSignal[];
  reviewStatus: OverlapReviewStatus;
  adjudicatedBy?: string;
  adjudicatedAt?: string;
  adjudicationNote?: string;
}

export interface AuditEvent {
  id: string;
  complaintId?: string;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
}
