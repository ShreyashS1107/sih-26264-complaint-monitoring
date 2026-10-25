"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useComplaints } from "../../lib/context/complaint-context";
import {
  IconChevronLeft,
  IconBuilding,
  IconUser,
  IconClock,
  IconFileText,
  IconAlertTriangle,
  IconScale,
  IconChevronRight,
  IconArrowRight,
  IconCheckCircle,
} from "../ui/icons";
import { StatusBadge, PriorityBadge, OverlapStatusBadge, Badge } from "../ui/badge";
import { ComplaintStatus } from "../../lib/types";
import { fadeInUpVariants, staggerContainerVariants } from "../../lib/motion";

interface ComplaintDetailViewProps {
  id: string;
}

const ALL_STATUSES: ComplaintStatus[] = [
  "Under Scrutiny",
  "Assigned to Bureau",
  "Show-Cause Notice Issued",
  "Institution Response Received",
  "Hearing Scheduled",
  "Escalated",
  "Resolved",
];

export const ComplaintDetailView: React.FC<ComplaintDetailViewProps> = ({ id }) => {
  const { complaints, updateComplaintStatus, getOverlapsForComplaint, auditLogs } = useComplaints();

  // Find complaint in live state
  const complaint = useMemo(() => {
    return complaints.find((c) => c.id === id);
  }, [complaints, id]);

  // Overlap candidates for this complaint
  const relatedOverlaps = useMemo(() => {
    return getOverlapsForComplaint(id);
  }, [getOverlapsForComplaint, id]);

  // Audit events for this complaint
  const relatedAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => log.complaintId === id);
  }, [auditLogs, id]);

  // Status transition state
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus | "">(
    complaint ? complaint.status : ""
  );
  const [statusNote, setStatusNote] = useState("");
  const [updateFeedback, setUpdateFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // If complaint is not found in the dataset
  if (!complaint) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-12 text-center shadow-xs">
        <IconAlertTriangle size={36} className="mx-auto text-amber-600 mb-3" />
        <h2 className="text-base font-bold text-[#172033]">Complaint Dossier Not Found</h2>
        <p className="mt-1 text-xs text-[#697386]">
          No institutional record was found with ID <span className="font-mono font-semibold text-[#172033]">{id}</span>.
        </p>
        <div className="mt-6">
          <Link
            href="/complaints"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#254EDB] transition-colors shadow-2xs"
          >
            <IconChevronLeft size={14} />
            <span>Return to Complaint Registry</span>
          </Link>
        </div>
      </div>
    );
  }

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatus) return;

    if (targetStatus === complaint.status) {
      setUpdateFeedback({
        type: "error",
        message: "Selected status is identical to the current status.",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const success = await updateComplaintStatus(
        complaint.id,
        targetStatus,
        statusNote.trim() || `Administrative status transition to ${targetStatus}`
      );
      if (success) {
        setUpdateFeedback({
          type: "success",
          message: `Status successfully updated to "${targetStatus}".`,
        });
        setStatusNote("");
      } else {
        setUpdateFeedback({
          type: "error",
          message: "Operation rejected by server: authorization required or invalid transition.",
        });
      }
    } catch {
      setUpdateFeedback({
        type: "error",
        message: "Failed to update complaint status.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 1. Breadcrumb and Back Navigation */}
      <motion.div variants={fadeInUpVariants} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/complaints"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5A6474] hover:text-[#0F172A] transition-colors"
        >
          <IconChevronLeft size={14} />
          <span>Back to Complaint Registry</span>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="warning" size="sm" className="font-mono">
            Demo Active
          </Badge>
          <span className="text-xs font-mono font-bold text-[#5A6474]">AICTE Apex Scrutiny</span>
        </div>
      </motion.div>

      {/* 2. Detail Header Banner */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E3DFD5] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-extrabold text-[#315EFB] tracking-tight bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                {complaint.id}
              </span>
              <PriorityBadge priority={complaint.priority} />
              <StatusBadge status={complaint.status} />
              <span className="text-xs font-semibold text-[#5A6474] border-l border-[#E3DFD5] pl-2 font-mono">
                {complaint.bureau}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0F172A] leading-snug">
              {complaint.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5A6474]">
              <span className="flex items-center gap-1.5 font-bold text-[#0F172A]">
                <IconBuilding size={14} className="text-slate-400" />
                <span>{complaint.institutionName}</span>
                <span className="font-mono text-[11px] text-[#5A6474]">({complaint.institutionId})</span>
              </span>
              <span>&bull;</span>
              <span>{complaint.state} &bull; <strong className="font-mono">{complaint.region} Region</strong></span>
            </div>
          </div>

          {/* Quick Filing Stats */}
          <div className="flex items-center gap-4 border-t lg:border-t-0 lg:border-l border-[#F0ECE1] pt-3 lg:pt-0 lg:pl-6 text-xs text-[#5A6474] shrink-0">
            <div>
              <span className="block text-[10px] font-mono uppercase text-[#5A6474]">Received Date</span>
              <span className="font-bold text-[#0F172A] tabular-nums font-mono">{complaint.filingDate}</span>
            </div>
            <div>
              <span className="block text-[10px] font-mono uppercase text-rose-700">Statutory Due</span>
              <span className="font-bold text-rose-800 tabular-nums font-mono">{complaint.deadlineDate}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Main Two-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Dossier Details, Allegations, Evidence */}
        <motion.div variants={fadeInUpVariants} className="lg:col-span-8 space-y-6">
          {/* Section: Grievance Narrative & Allegations */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#172033]">Grievance Narrative</h2>
              <p className="mt-2 text-xs leading-relaxed text-[#172033] bg-[#F8F9FA] p-4 rounded-lg border border-slate-100">
                {complaint.description}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-bold text-[#172033] mb-2.5">Specific Formal Allegations</h2>
              <ul className="space-y-2">
                {complaint.allegations.map((allegation, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2.5 text-xs text-[#172033] bg-white p-3 rounded-lg border border-[#E5E7EB]"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-[#697386] mt-0.5">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{allegation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section: Evidence Documents */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-[#172033]">
                  Uploaded Evidentiary Attachments
                </h2>
                <p className="text-xs text-[#697386]">
                  Supporting affidavits, official notices, and verifiable exhibits
                </p>
              </div>
              <span className="text-xs font-bold tabular-nums text-[#697386]">
                {complaint.evidence.length} Files
              </span>
            </div>

            {complaint.evidence.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#697386]">
                No evidentiary attachments were submitted with this grievance.
              </div>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {complaint.evidence.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#315EFB]">
                        <IconFileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-[#172033] truncate block" title={doc.name}>
                          {doc.name}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-[#697386] mt-0.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 border border-slate-200">
                            {doc.category}
                          </span>
                          <span>&bull;</span>
                          <span className="tabular-nums font-medium">{doc.fileSize}</span>
                          <span>&bull;</span>
                          <span className="tabular-nums">Uploaded: {doc.uploadDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center rounded-md border border-[#E5E7EB] bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 cursor-not-allowed shadow-2xs" title="Demonstration file exhibit - binary download not active">
                        Exhibit Logged
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Related Candidate Overlaps */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#172033]">
                    Correlated Overlap Signals
                  </h2>
                  <span className="text-[10px] font-bold text-[#B7791F] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Advisory Only
                  </span>
                </div>
                <p className="text-xs text-[#697386]">
                  Candidate matches detected across institution, personnel, or allegations
                </p>
              </div>
              <span className="text-xs font-bold text-[#697386]">
                {relatedOverlaps.length} Match Candidates
              </span>
            </div>

            {relatedOverlaps.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#697386]">
                <IconCheckCircle size={28} className="mx-auto mb-2 text-emerald-600" />
                <p className="font-semibold text-[#172033]">No correlated overlap signals detected</p>
                <p className="text-slate-400 mt-0.5">This complaint currently has no cross-case candidate matches in the queue.</p>
              </div>
            ) : (
              <div className="mt-3.5 space-y-3">
                {relatedOverlaps.map((ovl) => {
                  const otherId = ovl.sourceComplaintId === complaint.id ? ovl.targetComplaintId : ovl.sourceComplaintId;
                  const otherComplaint = complaints.find((c) => c.id === otherId);

                  return (
                    <div
                      key={ovl.id}
                      className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-4 space-y-2.5 hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#172033]">
                            Pair with {otherId}
                          </span>
                          <OverlapStatusBadge status={ovl.reviewStatus} />
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-[#315EFB] border border-blue-200">
                          {ovl.signalScore}% Signal Score
                        </span>
                      </div>

                      {otherComplaint && (
                        <p className="text-xs font-semibold text-[#172033] line-clamp-1">
                          {otherComplaint.title}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1 text-[10px] text-[#697386]">
                        {ovl.matchingSignals.map((sig) => (
                          <span
                            key={sig.type}
                            className="inline-block rounded-md bg-white px-2 py-0.5 border border-slate-200"
                          >
                            <span className="font-semibold text-slate-800">{sig.type}:</span> {sig.detail}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs">
                        <span className="text-[11px] text-[#697386] italic">
                          Requires explicit human adjudication
                        </span>
                        <Link
                          href={`/overlap-review/compare?source=${ovl.sourceComplaintId}&target=${ovl.targetComplaintId}`}
                          className="inline-flex items-center gap-1 font-bold text-[#315EFB] hover:text-[#254EDB]"
                        >
                          <span>Compare Side-by-Side</span>
                          <IconChevronRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Column (4 cols): Status Dispatch, Complainant Profile, Audit Timeline */}
        <motion.div variants={fadeInUpVariants} className="lg:col-span-4 space-y-6">
          {/* Action Center: Status Transition Dispatch */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="text-sm font-bold text-[#172033] pb-2.5 border-b border-slate-100 flex items-center gap-2">
              <IconScale size={16} className="text-[#315EFB]" />
              <span>Administrative Action Dispatch</span>
            </h2>

            <form onSubmit={handleStatusUpdate} className="mt-3.5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#697386] mb-1">
                  Current Procedural Status
                </label>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#172033]">
                    {complaint.status}
                  </span>
                  <StatusBadge status={complaint.status} />
                </div>
              </div>

              <div>
                <label htmlFor="new-status-select" className="block text-xs font-semibold text-[#697386] mb-1">
                  Transition Status To
                </label>
                <select
                  id="new-status-select"
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as ComplaintStatus)}
                  className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#172033] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
                >
                  {ALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status} {status === complaint.status ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="status-note-input" className="block text-xs font-semibold text-[#697386] mb-1">
                  Administrative Scrutiny Note (Optional)
                </label>
                <textarea
                  id="status-note-input"
                  rows={3}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Record justification, directive, or institutional notice reference..."
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white p-2.5 text-xs text-[#172033] placeholder:text-[#697386] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
                />
              </div>

              {updateFeedback && (
                <div
                  className={`p-2.5 rounded-lg text-xs border font-medium ${
                    updateFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {updateFeedback.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdating || targetStatus === complaint.status}
                className="w-full h-9.5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#315EFB] text-xs font-bold text-white hover:bg-[#254EDB] disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
              >
                <span>{isUpdating ? "Applying..." : "Apply Status Transition"}</span>
                <IconArrowRight size={13} />
              </button>
            </form>
          </div>

          {/* Complainant Profile Card */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3">
            <h2 className="text-sm font-bold text-[#172033] pb-2.5 border-b border-slate-100 flex items-center gap-2">
              <IconUser size={16} className="text-[#315EFB]" />
              <span>Complainant Record</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#697386]">Affiliation Category:</span>
                <span className="font-semibold text-[#172033]">{complaint.complainantType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#697386]">Identity Protection:</span>
                <span className="text-emerald-700 font-semibold">Masked / Protected</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#697386]">Contact Verification:</span>
                <span className="font-mono text-slate-500 font-medium">Hash Match Active</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#697386]">Grievance Domain:</span>
                <span className="font-semibold text-[#172033]">{complaint.category}</span>
              </div>
            </div>
          </div>

          {/* Chronological Audit Activity */}
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                <IconClock size={16} className="text-[#315EFB]" />
                <span>Case Audit Log</span>
              </h2>
              <span className="text-[11px] font-bold text-[#697386]">
                {relatedAuditLogs.length} Events
              </span>
            </div>

            {relatedAuditLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#697386]">
                No administrative actions logged yet for this dossier.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {relatedAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-[#F8F9FA] border border-slate-100 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#172033]">{log.action}</span>
                      <span className="tabular-nums text-[10px] text-slate-400">{log.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#697386] leading-relaxed">
                      {log.details}
                    </p>
                    <div className="text-[10px] text-slate-400 pt-0.5">
                      By: <span className="text-[#172033] font-semibold">{log.actor}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
