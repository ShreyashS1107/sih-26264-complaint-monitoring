"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import {
  Complaint,
  ComplaintStatus,
  OverlapCandidate,
  OverlapReviewStatus,
  AuditEvent,
} from "../types";
import { DEMO_COMPLAINTS } from "../mock-data/complaints";
import { DEMO_OVERLAPS } from "../mock-data/overlaps";
import { DEMO_AUDIT_LOGS } from "../mock-data/audit";

interface ComplaintContextType {
  complaints: Complaint[];
  overlaps: OverlapCandidate[];
  auditLogs: AuditEvent[];
  pendingOverlapCount: number;
  criticalComplaintCount: number;
  updateComplaintStatus: (id: string, status: ComplaintStatus, note?: string) => void;
  adjudicateOverlap: (
    overlapId: string,
    decision: OverlapReviewStatus,
    note: string,
    officerName?: string
  ) => void;
  getComplaint: (id: string) => Complaint | undefined;
  getOverlap: (id: string) => OverlapCandidate | undefined;
  getOverlapsForComplaint: (complaintId: string) => OverlapCandidate[];
}

const ComplaintContext = createContext<ComplaintContextType | null>(null);

export const ComplaintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [complaints, setComplaints] = useState<Complaint[]>(DEMO_COMPLAINTS);
  const [overlaps, setOverlaps] = useState<OverlapCandidate[]>(DEMO_OVERLAPS);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(DEMO_AUDIT_LOGS);

  // Compute pending overlaps count for badges
  const pendingOverlapCount = useMemo(() => {
    return overlaps.filter((o) => o.reviewStatus === "Pending").length;
  }, [overlaps]);

  // Compute critical complaints count
  const criticalComplaintCount = useMemo(() => {
    return complaints.filter((c) => c.priority === "Critical" && c.status !== "Resolved").length;
  }, [complaints]);

  // Update a complaint status and log audit event
  const updateComplaintStatus = useCallback(
    (id: string, newStatus: ComplaintStatus, note?: string) => {
      const now = new Date();
      const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;

      setComplaints((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );

      const newAudit: AuditEvent = {
        id: `AUD-${Date.now()}`,
        complaintId: id,
        actor: "Authorized Scrutiny Officer",
        action: `Status Updated to ${newStatus}`,
        details: note || `Complaint ${id} transition to ${newStatus}`,
        timestamp,
      };

      setAuditLogs((prev) => [newAudit, ...prev]);
    },
    []
  );

  // Adjudicate an overlap pair
  const adjudicateOverlap = useCallback(
    (
      overlapId: string,
      decision: OverlapReviewStatus,
      note: string,
      officerName: string = "Dr. S. K. Rao (Apex Scrutiny Officer)"
    ) => {
      const now = new Date();
      const timestamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`;

      let affectedSourceId = "";
      let affectedTargetId = "";

      setOverlaps((prev) =>
        prev.map((item) => {
          if (item.id === overlapId) {
            affectedSourceId = item.sourceComplaintId;
            affectedTargetId = item.targetComplaintId;
            return {
              ...item,
              reviewStatus: decision,
              adjudicatedBy: officerName,
              adjudicatedAt: timestamp,
              adjudicationNote: note,
            };
          }
          return item;
        })
      );

      // If linked as related, update relatedCaseIds for both complaints
      if (decision === "Linked" && affectedSourceId && affectedTargetId) {
        setComplaints((prev) =>
          prev.map((c) => {
            if (c.id === affectedSourceId) {
              const current = c.relatedCaseIds || [];
              return {
                ...c,
                relatedCaseIds: current.includes(affectedTargetId)
                  ? current
                  : [...current, affectedTargetId],
              };
            }
            if (c.id === affectedTargetId) {
              const current = c.relatedCaseIds || [];
              return {
                ...c,
                relatedCaseIds: current.includes(affectedSourceId)
                  ? current
                  : [...current, affectedSourceId],
              };
            }
            return c;
          })
        );
      }

      const newAudit: AuditEvent = {
        id: `AUD-${Date.now()}`,
        complaintId: affectedSourceId || undefined,
        actor: officerName,
        action: `Overlap Adjudicated: ${decision}`,
        details: `Human verdict '${decision}' for candidate pair (${affectedSourceId || "N/A"} ↔ ${
          affectedTargetId || "N/A"
        }). Rationale: ${note}`,
        timestamp,
      };

      setAuditLogs((prev) => [newAudit, ...prev]);
    },
    []
  );

  const getComplaint = useCallback(
    (id: string) => {
      return complaints.find((c) => c.id === id);
    },
    [complaints]
  );

  const getOverlap = useCallback(
    (id: string) => {
      return overlaps.find((o) => o.id === id);
    },
    [overlaps]
  );

  const getOverlapsForComplaint = useCallback(
    (complaintId: string) => {
      return overlaps.filter(
        (o) => o.sourceComplaintId === complaintId || o.targetComplaintId === complaintId
      );
    },
    [overlaps]
  );

  const value = useMemo(
    () => ({
      complaints,
      overlaps,
      auditLogs,
      pendingOverlapCount,
      criticalComplaintCount,
      updateComplaintStatus,
      adjudicateOverlap,
      getComplaint,
      getOverlap,
      getOverlapsForComplaint,
    }),
    [
      complaints,
      overlaps,
      auditLogs,
      pendingOverlapCount,
      criticalComplaintCount,
      updateComplaintStatus,
      adjudicateOverlap,
      getComplaint,
      getOverlap,
      getOverlapsForComplaint,
    ]
  );

  return <ComplaintContext.Provider value={value}>{children}</ComplaintContext.Provider>;
};

export const useComplaints = (): ComplaintContextType => {
  const context = useContext(ComplaintContext);
  if (!context) {
    throw new Error("useComplaints must be used within a ComplaintProvider");
  }
  return context;
};
