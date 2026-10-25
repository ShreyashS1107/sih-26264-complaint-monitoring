"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useComplaints } from "../../../lib/context/complaint-context";
import {
  IconChevronLeft,
  IconBuilding,
  IconUser,
  IconClock,
  IconFileText,
  IconAlertTriangle,
  IconLayers,
  IconScale,
  IconArrowRight,
} from "../../../components/ui/icons";
import { StatusBadge, PriorityBadge, OverlapStatusBadge, Badge } from "../../../components/ui/badge";
import { OverlapReviewStatus } from "../../../lib/types";
import { fadeInUpVariants, staggerContainerVariants } from "../../../lib/motion";

function OverlapCompareContent() {
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("source") || "";
  const targetId = searchParams.get("target") || "";

  const { complaints, overlaps, adjudicateOverlap } = useComplaints();

  // 1. Resolve both complaints
  const sourceComplaint = useMemo(
    () => complaints.find((c) => c.id === sourceId),
    [complaints, sourceId]
  );
  const targetComplaint = useMemo(
    () => complaints.find((c) => c.id === targetId),
    [complaints, targetId]
  );

  // 2. Resolve matching candidate pair (checking both orientations)
  const candidate = useMemo(() => {
    if (!sourceId || !targetId) return undefined;
    return overlaps.find(
      (o) =>
        (o.sourceComplaintId === sourceId && o.targetComplaintId === targetId) ||
        (o.sourceComplaintId === targetId && o.targetComplaintId === sourceId)
    );
  }, [overlaps, sourceId, targetId]);

  // Adjudication form state
  const [selectedVerdict, setSelectedVerdict] = useState<OverlapReviewStatus>(
    candidate ? candidate.reviewStatus : "Pending"
  );
  const [officerName, setOfficerName] = useState("Dr. S. K. Rao (Apex Scrutiny Officer)");
  const [rationaleNote, setRationaleNote] = useState(
    candidate?.adjudicationNote || ""
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 3. Validation / Error States
  if (!sourceId || !targetId) {
    return (
      <div className="rounded-xl border border-[#E3DFD5] bg-white p-12 text-center shadow-xs">
        <IconAlertTriangle size={36} className="mx-auto text-amber-600 mb-3" />
        <h2 className="text-base font-bold text-[#0F172A]">Missing Comparison Parameters</h2>
        <p className="mt-1 text-xs text-[#5A6474]">
          Both source and target complaint identifiers must be supplied to open the side-by-side comparison workspace.
        </p>
        <div className="mt-6">
          <Link
            href="/overlap-review"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-4 py-2 text-xs font-bold text-white hover:bg-[#254EDB] shadow-2xs transition-colors"
          >
            <IconChevronLeft size={14} />
            <span>Return to Overlap Review Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  if (sourceId === targetId) {
    return (
      <div className="rounded-xl border border-[#E3DFD5] bg-white p-12 text-center shadow-xs">
        <IconAlertTriangle size={36} className="mx-auto text-rose-600 mb-3" />
        <h2 className="text-base font-bold text-[#0F172A]">Invalid Comparison Request</h2>
        <p className="mt-1 text-xs text-[#5A6474]">
          Cannot compare complaint <span className="font-mono font-bold text-[#0F172A]">{sourceId}</span> against itself.
        </p>
        <div className="mt-6">
          <Link
            href="/overlap-review"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-4 py-2 text-xs font-bold text-white hover:bg-[#254EDB] shadow-2xs transition-colors"
          >
            <IconChevronLeft size={14} />
            <span>Return to Overlap Review Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!sourceComplaint || !targetComplaint) {
    return (
      <div className="rounded-xl border border-[#E3DFD5] bg-white p-12 text-center shadow-xs">
        <IconAlertTriangle size={36} className="mx-auto text-amber-600 mb-3" />
        <h2 className="text-base font-bold text-[#0F172A]">Referenced Dossier Not Found</h2>
        <p className="mt-1 text-xs text-[#5A6474]">
          One or both complaint records ({!sourceComplaint ? sourceId : ""} {!targetComplaint ? targetId : ""}) could not be located in the active institutional dataset.
        </p>
        <div className="mt-6">
          <Link
            href="/overlap-review"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-4 py-2 text-xs font-bold text-white hover:bg-[#254EDB] shadow-2xs transition-colors"
          >
            <IconChevronLeft size={14} />
            <span>Return to Overlap Review Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="rounded-xl border border-[#E3DFD5] bg-white p-12 text-center shadow-xs">
        <IconAlertTriangle size={36} className="mx-auto text-amber-600 mb-3" />
        <h2 className="text-base font-bold text-[#0F172A]">Candidate Overlap Record Not Found</h2>
        <p className="mt-1 text-xs text-[#5A6474]">
          No pre-calculated algorithmic candidate match exists between <span className="font-mono font-bold text-[#0F172A]">{sourceId}</span> and <span className="font-mono font-bold text-[#0F172A]">{targetId}</span> in the review queue.
        </p>
        <div className="mt-6">
          <Link
            href="/overlap-review"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-4 py-2 text-xs font-bold text-white hover:bg-[#254EDB] shadow-2xs transition-colors"
          >
            <IconChevronLeft size={14} />
            <span>Return to Overlap Review Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Handle Adjudication Submit
  const handleAdjudicationSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!rationaleNote.trim()) {
      setFeedback({
        type: "error",
        message: "A mandatory administrative scrutiny note / rationale is required before recording a verdict.",
      });
      return;
    }

    if (selectedVerdict === "Pending") {
      setFeedback({
        type: "error",
        message: "Please select an explicit administrative determination (Linked, Independent, or Dismissed).",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      adjudicateOverlap(candidate.id, selectedVerdict, rationaleNote.trim(), officerName.trim());
      setFeedback({
        type: "success",
        message: `Human adjudication decision "${selectedVerdict}" successfully recorded for pair ${candidate.id}.`,
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to record adjudication decision.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 1. Breadcrumb & Navigation */}
      <motion.div variants={fadeInUpVariants} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/overlap-review"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5A6474] hover:text-[#0F172A] transition-colors"
        >
          <IconChevronLeft size={14} />
          <span>Back to Overlap Review Queue</span>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="warning" size="sm" className="font-mono">
            Demo Active
          </Badge>
          <span className="text-xs font-mono font-bold text-[#5A6474]">Pair: {candidate.id}</span>
        </div>
      </motion.div>

      {/* 2. Workspace Header Banner */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E2DDD3] bg-white p-5 sm:p-6 shadow-[0_1px_4px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-sm font-extrabold text-[#0F172A] bg-[#FAF8F4] border border-[#E2DDD3] px-2.5 py-0.5 rounded-md">
                {candidate.id}
              </span>
              <OverlapStatusBadge status={candidate.reviewStatus} />
              <span className="text-xs text-slate-300">&bull;</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border font-mono ${
                  candidate.signalScore >= 80
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : candidate.signalScore >= 60
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}
                title="Algorithmic signal score only - not a final decision"
              >
                <IconLayers size={13} />
                <span>{candidate.signalScore}% Advisory Signal Match</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0F172A]">
              Side-by-Side Grievance Comparison &amp; Human Adjudication
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6474]">
              Clause-by-clause scrutiny between <strong className="text-[#0F172A] font-mono">{sourceComplaint.id}</strong> and <strong className="text-[#0F172A] font-mono">{targetComplaint.id}</strong>
            </p>
          </div>

          <div className="border-t lg:border-t-0 lg:border-l border-[#EAE5DA] pt-3 lg:pt-0 lg:pl-6 text-xs text-[#5A6474] shrink-0">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-[#5A6474]">Triage Status</span>
            <span className="font-bold text-[#0F172A] text-sm">
              {candidate.reviewStatus === "Pending" ? "Awaiting Scrutiny Verdict" : `Adjudicated: ${candidate.reviewStatus}`}
            </span>
          </div>
        </div>

        {/* Human Scrutiny Responsibility Notice */}
        <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/30 border border-[#BFDBFE] p-4 flex items-start gap-3 text-xs text-[#0F172A]">
          <div className="rounded-lg bg-[#315EFB] p-1.5 text-white shrink-0 mt-0.5">
            <IconScale size={14} />
          </div>
          <p className="leading-relaxed">
            <strong className="text-blue-950 font-bold">Reviewer Statutory Authority: </strong>
            Algorithmic match scores are advisory pattern detection indicators only. Shared institution codes or similar complaint phrasing do not prove duplicate filings. Final administrative linkage or dismissal requires your explicit recorded determination.
          </p>
        </div>
      </motion.div>

      {/* 3. Candidate Matching Signals Section */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E2DDD3] bg-white p-5 sm:p-6 shadow-[0_1px_4px_rgba(15,23,42,0.03)]">
        <h2 className="text-sm font-bold text-[#0F172A] pb-2.5 border-b border-[#EAE5DA] flex items-center gap-2">
          <IconLayers size={16} className="text-[#315EFB]" />
          <span>Convergence Dimensions &amp; Advisory Signals</span>
        </h2>
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {candidate.matchingSignals.map((sig, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#FAF8F4] border border-[#E2DDD3] space-y-1 shadow-2xs">
              <span className="block font-bold text-xs text-[#315EFB] font-mono">
                {sig.type}
              </span>
              <p className="text-xs text-[#0F172A] leading-relaxed">
                {sig.detail}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 4. Dual Comparison Panels (Equally Weighted 50% / 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANE 1: Source Complaint */}
        <motion.div variants={fadeInUpVariants} className="rounded-xl border-2 border-blue-200 bg-white p-5 sm:p-6 shadow-[0_1px_4px_rgba(15,23,42,0.03)] space-y-4">
          {/* Header */}
          <div className="pb-3 border-b border-[#EAE5DA] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#315EFB] bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                  {sourceComplaint.id}
                </span>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900 uppercase font-mono">
                  Source Case
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <PriorityBadge priority={sourceComplaint.priority} />
                <StatusBadge status={sourceComplaint.status} />
              </div>
            </div>
            <Link
              href={`/complaints/${sourceComplaint.id}`}
              className="text-xs font-bold text-[#315EFB] hover:underline"
            >
              Open Dossier &rarr;
            </Link>
          </div>

          {/* Title */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6474] font-mono">Grievance Subject</span>
            <h3 className="text-sm font-bold text-[#0F172A] mt-0.5">{sourceComplaint.title}</h3>
          </div>

          {/* Institutional Metadata */}
          <div className="rounded-xl bg-[#FAF8F4] p-3.5 border border-[#E2DDD3] space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#0F172A]">
              <IconBuilding size={14} className="text-slate-400" />
              <span>{sourceComplaint.institutionName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[#5A6474]">
              <span>ID: <strong className="font-mono">{sourceComplaint.institutionId}</strong></span>
              <span>&bull;</span>
              <span>{sourceComplaint.bureau}</span>
              <span>&bull;</span>
              <span>{sourceComplaint.state} ({sourceComplaint.region})</span>
            </div>
          </div>

          {/* Complainant Profile & Dates */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF8F4] p-3 rounded-xl border border-[#E2DDD3]">
            <div>
              <span className="text-[10px] font-mono text-[#5A6474] block uppercase">Complainant Affiliation</span>
              <span className="font-bold text-[#0F172A] flex items-center gap-1 mt-0.5">
                <IconUser size={12} className="text-slate-400" />
                <span>{sourceComplaint.complainantType}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#5A6474] block uppercase">Filing Date</span>
              <span className="font-bold text-[#0F172A] tabular-nums font-mono flex items-center gap-1 mt-0.5">
                <IconClock size={12} className="text-slate-400" />
                <span>{sourceComplaint.filingDate}</span>
              </span>
            </div>
          </div>

          {/* Grievance Narrative */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6474] font-mono">Grievance Narrative</span>
            <div className="mt-1 p-3.5 rounded-xl bg-[#FAF8F4] border border-[#E2DDD3] text-xs text-[#0F172A] leading-relaxed">
              {sourceComplaint.description}
            </div>
          </div>

          {/* Specific Allegations */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6474] font-mono">Allegations Checklist</span>
            <ul className="mt-1 space-y-1.5">
              {sourceComplaint.allegations.map((a, i) => (
                <li key={i} className="text-xs p-2.5 rounded-lg bg-white border border-[#E2DDD3] flex items-start gap-2 text-[#0F172A]">
                  <span className="h-4.5 w-4.5 rounded-full bg-blue-50 text-[#315EFB] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Evidentiary Attachments */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6474] font-mono">Evidence Exhibits ({sourceComplaint.evidence.length})</span>
            <div className="mt-1 divide-y divide-[#EAE5DA] rounded-xl border border-[#E2DDD3] p-2 bg-[#FAF8F4]">
              {sourceComplaint.evidence.map((doc) => (
                <div key={doc.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <IconFileText size={14} className="text-[#315EFB] shrink-0" />
                    <span className="truncate font-bold text-[#0F172A]">{doc.name}</span>
                  </div>
                  <span className="text-[10px] text-[#5A6474] tabular-nums shrink-0 font-mono">{doc.fileSize}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* PANE 2: Target Complaint */}
        <motion.div variants={fadeInUpVariants} className="rounded-xl border-2 border-indigo-200 bg-white p-5 sm:p-6 shadow-[0_1px_4px_rgba(15,23,42,0.03)] space-y-4">
          {/* Header */}
          <div className="pb-3 border-b border-[#EAE5DA] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#315EFB] bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                  {targetComplaint.id}
                </span>
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-900 uppercase font-mono">
                  Target Case
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <PriorityBadge priority={targetComplaint.priority} />
                <StatusBadge status={targetComplaint.status} />
              </div>
            </div>
            <Link
              href={`/complaints/${targetComplaint.id}`}
              className="text-xs font-bold text-[#315EFB] hover:underline"
            >
              Open Dossier &rarr;
            </Link>
          </div>

          {/* Title */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6474] font-mono">Grievance Subject</span>
            <h3 className="text-sm font-bold text-[#0F172A] mt-0.5">{targetComplaint.title}</h3>
          </div>

          {/* Institutional Metadata */}
          <div className="rounded-xl bg-[#FAF8F4] p-3.5 border border-[#E2DDD3] space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#0F172A]">
              <IconBuilding size={14} className="text-slate-400" />
              <span>{targetComplaint.institutionName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[#5A6474]">
              <span>ID: <strong className="font-mono">{targetComplaint.institutionId}</strong></span>
              <span>&bull;</span>
              <span>{targetComplaint.bureau}</span>
              <span>&bull;</span>
              <span>{targetComplaint.state} ({targetComplaint.region})</span>
            </div>
          </div>

          {/* Complainant Profile & Dates */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF8F4] p-3 rounded-xl border border-[#E2DDD3]">
            <div>
              <span className="text-[10px] font-mono text-[#5A6474] block uppercase">Complainant Affiliation</span>
              <span className="font-bold text-[#0F172A] flex items-center gap-1 mt-0.5">
                <IconUser size={12} className="text-slate-400" />
                <span>{targetComplaint.complainantType}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#5A6474] block uppercase">Filing Date</span>
              <span className="font-bold text-[#0F172A] tabular-nums font-mono flex items-center gap-1 mt-0.5">
                <IconClock size={12} className="text-slate-400" />
                <span>{targetComplaint.filingDate}</span>
              </span>
            </div>
          </div>

          {/* Grievance Narrative */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6474] font-mono">Grievance Narrative</span>
            <div className="mt-1 p-3.5 rounded-xl bg-[#FAF8F4] border border-[#E2DDD3] text-xs text-[#0F172A] leading-relaxed">
              {targetComplaint.description}
            </div>
          </div>

          {/* Specific Allegations */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6474] font-mono">Allegations Checklist</span>
            <ul className="mt-1 space-y-1.5">
              {targetComplaint.allegations.map((a, i) => (
                <li key={i} className="text-xs p-2.5 rounded-lg bg-white border border-[#E2DDD3] flex items-start gap-2 text-[#0F172A]">
                  <span className="h-4.5 w-4.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Evidentiary Attachments */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6474] font-mono">Evidence Exhibits ({targetComplaint.evidence.length})</span>
            <div className="mt-1 divide-y divide-[#EAE5DA] rounded-xl border border-[#E2DDD3] p-2 bg-[#FAF8F4]">
              {targetComplaint.evidence.map((doc) => (
                <div key={doc.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <IconFileText size={14} className="text-[#315EFB] shrink-0" />
                    <span className="truncate font-bold text-[#0F172A]">{doc.name}</span>
                  </div>
                  <span className="text-[10px] text-[#5A6474] tabular-nums shrink-0 font-mono">{doc.fileSize}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 5. Human Adjudication Decision Panel */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E2DDD3] bg-white p-6 shadow-[0_1px_4px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#EAE5DA]">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#0F172A] flex items-center gap-2">
              <IconScale size={18} className="text-[#315EFB]" />
              <span>Official Human Adjudication Determination</span>
            </h2>
            <p className="text-xs text-[#5A6474]">
              Record your formal administrative finding for candidate pair <span className="font-mono font-bold text-[#0F172A]">{candidate.id}</span>
            </p>
          </div>
          <OverlapStatusBadge status={candidate.reviewStatus} />
        </div>

        {/* Prior Determination Details if Already Reviewed */}
        {candidate.reviewStatus !== "Pending" && (
          <div className="mt-4 rounded-xl bg-emerald-50/60 border border-emerald-200 p-4 text-xs text-[#0F172A]">
            <div className="flex items-center justify-between text-[11px] text-emerald-800 mb-1 font-mono">
              <span className="font-bold">
                Current Ruling: {candidate.reviewStatus}
              </span>
              <span className="tabular-nums">Recorded: {candidate.adjudicatedAt} by {candidate.adjudicatedBy}</span>
            </div>
            <p className="text-xs text-slate-800 italic">
              &ldquo;{candidate.adjudicationNote}&rdquo;
            </p>
            <p className="mt-2 text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
              Note: This candidate pair was previously adjudicated. Submitting a new decision will record an amended administrative ruling in the immutable audit trail.
            </p>
          </div>
        )}

        <form onSubmit={handleAdjudicationSubmit} className="mt-5 space-y-4">
          {/* Verdict Selector (3 Explicit Options) */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-2 uppercase tracking-wider font-mono">
              Select Administrative Verdict:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Link Complaints */}
              <label
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedVerdict === "Linked"
                    ? "border-[#315EFB] bg-blue-50/70 shadow-xs"
                    : "border-[#E2DDD3] bg-[#FAF8F4] hover:border-slate-400"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-[#0F172A]">Link as Related Cases</span>
                  <input
                    type="radio"
                    name="verdict"
                    value="Linked"
                    checked={selectedVerdict === "Linked"}
                    onChange={() => setSelectedVerdict("Linked")}
                    className="text-[#315EFB] focus:ring-[#315EFB]"
                  />
                </div>
                <p className="text-[11px] text-[#5A6474] leading-relaxed">
                  Both complaints represent correlated grievances. Maintain both original dossiers while linking them for joint committee hearing.
                </p>
              </label>

              {/* Option 2: Mark as Independent */}
              <label
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedVerdict === "Independent"
                    ? "border-emerald-600 bg-emerald-50/70 shadow-xs"
                    : "border-[#E2DDD3] bg-[#FAF8F4] hover:border-slate-400"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-[#0F172A]">Mark as Independent</span>
                  <input
                    type="radio"
                    name="verdict"
                    value="Independent"
                    checked={selectedVerdict === "Independent"}
                    onChange={() => setSelectedVerdict("Independent")}
                    className="text-emerald-600 focus:ring-emerald-600"
                  />
                </div>
                <p className="text-[11px] text-[#5A6474] leading-relaxed">
                  Confirmed distinct grievances. Algorithmic overlap is coincidental or non-actionable; complaints remain on separate procedural paths.
                </p>
              </label>

              {/* Option 3: Dismiss Overlap */}
              <label
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedVerdict === "Dismissed"
                    ? "border-slate-600 bg-slate-100 shadow-xs"
                    : "border-[#E2DDD3] bg-[#FAF8F4] hover:border-slate-400"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-[#0F172A]">Dismiss Overlap Candidate</span>
                  <input
                    type="radio"
                    name="verdict"
                    value="Dismissed"
                    checked={selectedVerdict === "Dismissed"}
                    onChange={() => setSelectedVerdict("Dismissed")}
                    className="text-slate-600 focus:ring-slate-600"
                  />
                </div>
                <p className="text-[11px] text-[#5A6474] leading-relaxed">
                  Spurious match signal. Dismiss candidate pair completely from active triage queue.
                </p>
              </label>
            </div>
          </div>

          {/* Reviewer Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="officer-input" className="block text-xs font-semibold text-[#5A6474] mb-1">
                Adjudicating Scrutiny Officer
              </label>
              <input
                id="officer-input"
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#D6CFC4] bg-white px-3 text-xs font-bold text-[#0F172A] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
              />
            </div>
          </div>

          {/* Mandatory Rationale Note */}
          <div>
            <label htmlFor="rationale-input" className="block text-xs font-semibold text-[#5A6474] mb-1">
              Mandatory Scrutiny Rationale &amp; Institutional Directive *
            </label>
            <textarea
              id="rationale-input"
              rows={3}
              value={rationaleNote}
              onChange={(e) => setRationaleNote(e.target.value)}
              placeholder="Record explicit administrative justification for this finding (e.g. 'Both complaints target identical fee demands during admission; linked for joint inquiry under Approval Bureau')..."
              className="w-full rounded-lg border border-[#D6CFC4] bg-white p-3 text-xs text-[#0F172A] placeholder:text-slate-400 focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs font-medium"
              required
            />
          </div>

          {/* Feedback Notice */}
          {feedback && (
            <div
              className={`p-3.5 rounded-lg text-xs border font-medium ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-rose-50 text-rose-900 border-rose-200"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Submit Action Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-[#EAE5DA]">
            <Link
              href="/overlap-review"
              className="text-xs font-bold text-[#5A6474] hover:text-[#0F172A]"
            >
              Cancel &amp; Return to Queue
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || selectedVerdict === "Pending"}
              className="inline-flex items-center gap-2 rounded-lg bg-[#315EFB] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#254EDB] disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all active:scale-98"
            >
              <span>{isSubmitting ? "Recording Ruling..." : "Record Official Adjudication"}</span>
              <IconArrowRight size={14} />
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function OverlapComparePage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#697386]">Loading comparison workspace...</div>}>
      <OverlapCompareContent />
    </Suspense>
  );
}
