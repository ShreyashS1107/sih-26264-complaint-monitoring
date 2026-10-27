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
  const [selectedVerdict, setSelectedVerdict] = useState<OverlapReviewStatus | "Pass">(
    candidate ? candidate.reviewStatus : "Pending"
  );
  const [officerName, setOfficerName] = useState("Dr. S. K. Rao (Apex Scrutiny Officer)");
  const [rationaleNote, setRationaleNote] = useState(
    candidate?.adjudicationNote || ""
  );
  const [institutionalDirective, setInstitutionalDirective] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 3. Validation / Error States
  if (!sourceId || !targetId) {
    return (
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center shadow-xs">
        <IconAlertTriangle size={36} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-base font-bold text-[var(--text-primary)]">Missing Comparison Parameters</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Both source and target complaint identifiers must be supplied to open the side-by-side comparison workspace.
        </p>
        <div className="mt-6">
          <Link
            href="/overlap-review"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--primary-accent-hover)] shadow-[0_0_15px_var(--primary-accent-glow)] transition-colors"
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
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center shadow-xs">
        <IconAlertTriangle size={36} className="mx-auto text-rose-500 mb-3" />
        <h2 className="text-base font-bold text-[var(--text-primary)]">Invalid Comparison Request</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Cannot compare complaint <span className="font-mono font-bold text-[var(--text-primary)]">{sourceId}</span> against itself.
        </p>
        <div className="mt-6">
          <Link
            href="/overlap-review"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--primary-accent-hover)] shadow-[0_0_15px_var(--primary-accent-glow)] transition-colors"
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
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center shadow-xs">
        <IconAlertTriangle size={36} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-base font-bold text-[var(--text-primary)]">Referenced Dossier Not Found</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          One or both complaint records ({!sourceComplaint ? sourceId : ""} {!targetComplaint ? targetId : ""}) could not be located in the active institutional dataset.
        </p>
        <div className="mt-6">
          <Link
            href="/overlap-review"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--primary-accent-hover)] shadow-[0_0_15px_var(--primary-accent-glow)] transition-colors"
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
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center shadow-xs">
        <IconAlertTriangle size={36} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-base font-bold text-[var(--text-primary)]">Candidate Overlap Record Not Found</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          No pre-calculated algorithmic candidate match exists between <span className="font-mono font-bold text-[var(--text-primary)]">{sourceId}</span> and <span className="font-mono font-bold text-[var(--text-primary)]">{targetId}</span> in the review queue.
        </p>
        <div className="mt-6">
          <Link
            href="/overlap-review"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--primary-accent-hover)] shadow-[0_0_15px_var(--primary-accent-glow)] transition-colors"
          >
            <IconChevronLeft size={14} />
            <span>Return to Overlap Review Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  // 4. Handle Adjudication Submit
  const handleAdjudicationSubmit = async (e: React.FormEvent) => {
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
        message: "Please select an explicit administrative determination (Linked, Independent, Pass, or Dismissed).",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await adjudicateOverlap(
        candidate.id,
        selectedVerdict,
        rationaleNote.trim(),
        officerName.trim(),
        institutionalDirective.trim() || undefined
      );
      if (success) {
        setFeedback({
          type: "success",
          message: `Human adjudication decision "${selectedVerdict}" successfully recorded for pair ${candidate.id}.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: "Unable to record adjudication decision. Please check backend connection.",
        });
      }
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <IconChevronLeft size={14} />
          <span>Back to Overlap Review Queue</span>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm" className="font-mono">
            Adjudication Mode
          </Badge>
          <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">Pair: {candidate.id}</span>
        </div>
      </motion.div>

      {/* 2. Workspace Header Banner */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-sm font-extrabold text-[var(--text-primary)] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] px-2.5 py-0.5 rounded-md">
                {candidate.id}
              </span>
              <OverlapStatusBadge status={candidate.reviewStatus} />
              <span className="opacity-40">&bull;</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border font-mono ${
                  candidate.signalScore >= 80
                    ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                    : candidate.signalScore >= 60
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                    : "bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)] border-[var(--primary-accent)]/30"
                }`}
                title="Algorithmic signal score only - not a final decision"
              >
                <IconLayers size={13} />
                <span>{candidate.signalScore}% Advisory Signal Match</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
              Side-by-Side Grievance Comparison &amp; Human Adjudication
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Clause-by-clause scrutiny between <strong className="text-[var(--text-primary)] font-mono">{sourceComplaint.id}</strong> and <strong className="text-[var(--text-primary)] font-mono">{targetComplaint.id}</strong>
            </p>
          </div>

          <div className="border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] pt-3 lg:pt-0 lg:pl-6 text-xs text-[var(--text-secondary)] shrink-0">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">Triage Status</span>
            <span className="font-bold text-[var(--text-primary)] text-sm">
              {candidate.reviewStatus === "Pending" ? "Awaiting Scrutiny Verdict" : `Adjudicated: ${candidate.reviewStatus}`}
            </span>
          </div>
        </div>

        {/* Human Scrutiny Responsibility Notice */}
        <div className="mt-4 rounded-xl bg-gradient-to-r from-[var(--primary-accent-subtle)] to-[var(--bg-surface-elevated)] border border-[var(--primary-accent)]/30 p-4 flex items-start gap-3 text-xs text-[var(--text-primary)]">
          <div className="rounded-lg bg-[var(--primary-accent)] p-1.5 text-white shrink-0 mt-0.5">
            <IconScale size={14} />
          </div>
          <p className="leading-relaxed">
            <strong className="text-[var(--text-primary)] font-bold">Reviewer Statutory Authority: </strong>
            Algorithmic match scores are advisory pattern detection indicators only. Shared institution codes or similar complaint phrasing do not prove duplicate filings. Final administrative linkage or dismissal requires your explicit recorded determination.
          </p>
        </div>
      </motion.div>

      {/* 3. Candidate Matching Signals Section */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-xs">
        <h2 className="text-sm font-bold text-[var(--text-primary)] pb-2.5 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <IconLayers size={16} className="text-[var(--primary-accent)]" />
          <span>Convergence Dimensions &amp; Advisory Signals</span>
        </h2>
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {candidate.matchingSignals.map((sig, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] space-y-1 shadow-2xs">
              <span className="block font-bold text-xs text-[var(--primary-accent)] font-mono">
                {sig.type}
              </span>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                {sig.detail}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 4. Dual Comparison Panels (Equally Weighted 50% / 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANE 1: Source Complaint */}
        <motion.div variants={fadeInUpVariants} className="rounded-xl border-2 border-[var(--primary-accent)]/40 bg-[var(--bg-surface)] p-5 sm:p-6 shadow-xs space-y-4">
          {/* Header */}
          <div className="pb-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[var(--primary-accent)] bg-[var(--primary-accent-subtle)] border border-[var(--primary-accent)]/30 px-2 py-0.5 rounded-md">
                  {sourceComplaint.id}
                </span>
                <span className="rounded-md bg-[var(--primary-accent-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--primary-accent)] uppercase font-mono border border-[var(--primary-accent)]/20">
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
              className="text-xs font-bold text-[var(--primary-accent)] hover:underline"
            >
              Open Dossier &rarr;
            </Link>
          </div>

          {/* Title */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">Grievance Subject</span>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{sourceComplaint.title}</h3>
          </div>

          {/* Institutional Metadata */}
          <div className="rounded-xl bg-[var(--bg-surface-subtle)] p-3.5 border border-[var(--border-subtle)] space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
              <IconBuilding size={14} className="text-[var(--text-muted)]" />
              <span>{sourceComplaint.institutionName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--text-secondary)]">
              <span>ID: <strong className="font-mono">{sourceComplaint.institutionId}</strong></span>
              <span className="opacity-40">&bull;</span>
              <span>{sourceComplaint.bureau}</span>
              <span className="opacity-40">&bull;</span>
              <span>{sourceComplaint.state} ({sourceComplaint.region})</span>
            </div>
          </div>

          {/* Complainant Profile & Dates */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--bg-surface-subtle)] p-3 rounded-xl border border-[var(--border-subtle)]">
            <div>
              <span className="text-[10px] font-mono text-[var(--text-secondary)] block uppercase">Complainant Affiliation</span>
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1 mt-0.5">
                <IconUser size={12} className="text-[var(--text-muted)]" />
                <span>{sourceComplaint.complainantType}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-[var(--text-secondary)] block uppercase">Filing Date</span>
              <span className="font-bold text-[var(--text-primary)] tabular-nums font-mono flex items-center gap-1 mt-0.5">
                <IconClock size={12} className="text-[var(--text-muted)]" />
                <span>{sourceComplaint.filingDate}</span>
              </span>
            </div>
          </div>

          {/* Grievance Narrative */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">Grievance Narrative</span>
            <div className="mt-1 p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] leading-relaxed">
              {sourceComplaint.description}
            </div>
          </div>

          {/* Specific Allegations */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">Allegations Checklist</span>
            <ul className="mt-1 space-y-1.5">
              {sourceComplaint.allegations.map((a, i) => (
                <li key={i} className="text-xs p-2.5 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-start gap-2 text-[var(--text-primary)]">
                  <span className="h-4.5 w-4.5 rounded-full bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-[var(--primary-accent)]/30">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Evidentiary Attachments */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">Evidence Exhibits ({sourceComplaint.evidence.length})</span>
            <div className="mt-1 divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] p-2 bg-[var(--bg-surface-subtle)]">
              {sourceComplaint.evidence.map((doc) => (
                <div key={doc.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <IconFileText size={14} className="text-[var(--primary-accent)] shrink-0" />
                    <span className="truncate font-bold text-[var(--text-primary)]">{doc.name}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] tabular-nums shrink-0 font-mono">{doc.fileSize}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* PANE 2: Target Complaint */}
        <motion.div variants={fadeInUpVariants} className="rounded-xl border-2 border-indigo-500/40 bg-[var(--bg-surface)] p-5 sm:p-6 shadow-xs space-y-4">
          {/* Header */}
          <div className="pb-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[var(--primary-accent)] bg-[var(--primary-accent-subtle)] border border-[var(--primary-accent)]/30 px-2 py-0.5 rounded-md">
                  {targetComplaint.id}
                </span>
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 uppercase font-mono border border-indigo-500/20">
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
              className="text-xs font-bold text-[var(--primary-accent)] hover:underline"
            >
              Open Dossier &rarr;
            </Link>
          </div>

          {/* Title */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">Grievance Subject</span>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{targetComplaint.title}</h3>
          </div>

          {/* Institutional Metadata */}
          <div className="rounded-xl bg-[var(--bg-surface-subtle)] p-3.5 border border-[var(--border-subtle)] space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
              <IconBuilding size={14} className="text-[var(--text-muted)]" />
              <span>{targetComplaint.institutionName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--text-secondary)]">
              <span>ID: <strong className="font-mono">{targetComplaint.institutionId}</strong></span>
              <span className="opacity-40">&bull;</span>
              <span>{targetComplaint.bureau}</span>
              <span className="opacity-40">&bull;</span>
              <span>{targetComplaint.state} ({targetComplaint.region})</span>
            </div>
          </div>

          {/* Complainant Profile & Dates */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--bg-surface-subtle)] p-3 rounded-xl border border-[var(--border-subtle)]">
            <div>
              <span className="text-[10px] font-mono text-[var(--text-secondary)] block uppercase">Complainant Affiliation</span>
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1 mt-0.5">
                <IconUser size={12} className="text-[var(--text-muted)]" />
                <span>{targetComplaint.complainantType}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-[var(--text-secondary)] block uppercase">Filing Date</span>
              <span className="font-bold text-[var(--text-primary)] tabular-nums font-mono flex items-center gap-1 mt-0.5">
                <IconClock size={12} className="text-[var(--text-muted)]" />
                <span>{targetComplaint.filingDate}</span>
              </span>
            </div>
          </div>

          {/* Grievance Narrative */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">Grievance Narrative</span>
            <div className="mt-1 p-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] leading-relaxed">
              {targetComplaint.description}
            </div>
          </div>

          {/* Specific Allegations */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">Allegations Checklist</span>
            <ul className="mt-1 space-y-1.5">
              {targetComplaint.allegations.map((a, i) => (
                <li key={i} className="text-xs p-2.5 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-start gap-2 text-[var(--text-primary)]">
                  <span className="h-4.5 w-4.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/30">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Evidentiary Attachments */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] font-mono">Evidence Exhibits ({targetComplaint.evidence.length})</span>
            <div className="mt-1 divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] p-2 bg-[var(--bg-surface-subtle)]">
              {targetComplaint.evidence.map((doc) => (
                <div key={doc.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <IconFileText size={14} className="text-[var(--primary-accent)] shrink-0" />
                    <span className="truncate font-bold text-[var(--text-primary)]">{doc.name}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] tabular-nums shrink-0 font-mono">{doc.fileSize}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 5. Human Adjudication Decision Panel */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <IconScale size={18} className="text-[var(--primary-accent)]" />
              <span>Official Human Adjudication Determination</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Record your formal administrative finding for candidate pair <span className="font-mono font-bold text-[var(--text-primary)]">{candidate.id}</span>
            </p>
          </div>
          <OverlapStatusBadge status={candidate.reviewStatus} />
        </div>

        {/* Prior Determination Details if Already Reviewed */}
        {candidate.reviewStatus !== "Pending" && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-xs text-[var(--text-primary)]">
            <div className="flex items-center justify-between text-[11px] text-emerald-500 mb-1 font-mono">
              <span className="font-bold">
                Current Ruling: {candidate.reviewStatus}
              </span>
              <span className="tabular-nums">Recorded: {candidate.adjudicatedAt} by {candidate.adjudicatedBy}</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] italic">
              &ldquo;{candidate.adjudicationNote}&rdquo;
            </p>
            <p className="mt-2 text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/30">
              Note: This candidate pair was previously adjudicated. Submitting a new decision will record an amended administrative ruling in the immutable audit trail.
            </p>
          </div>
        )}

        <form onSubmit={handleAdjudicationSubmit} className="mt-5 space-y-4">
          {/* Verdict Selector (4 Explicit Options) */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider font-mono">
              Select Administrative Verdict:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Option 1: Link Complaints */}
              <label
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedVerdict === "Linked"
                    ? "border-[var(--primary-accent)] bg-[var(--primary-accent-subtle)] shadow-xs"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] hover:border-[var(--primary-accent)]/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-[var(--text-primary)]">Link as Related</span>
                  <input
                    type="radio"
                    name="verdict"
                    value="Linked"
                    checked={selectedVerdict === "Linked"}
                    onChange={() => setSelectedVerdict("Linked")}
                    className="text-[var(--primary-accent)] focus:ring-[var(--primary-accent)]"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Both complaints represent correlated grievances. Link for joint committee hearing.
                </p>
              </label>

              {/* Option 2: Mark as Independent */}
              <label
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedVerdict === "Independent"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-xs"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] hover:border-emerald-500/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-[var(--text-primary)]">Independent</span>
                  <input
                    type="radio"
                    name="verdict"
                    value="Independent"
                    checked={selectedVerdict === "Independent"}
                    onChange={() => setSelectedVerdict("Independent")}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Distinct grievances. Proceed on separate procedural paths without joint action.
                </p>
              </label>

              {/* Option 3: Pass (Clear Without Link) */}
              <label
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedVerdict === "Pass"
                    ? "border-blue-500 bg-blue-500/10 shadow-xs"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] hover:border-blue-500/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-[var(--text-primary)]">Pass</span>
                  <input
                    type="radio"
                    name="verdict"
                    value="Pass"
                    checked={selectedVerdict === "Pass"}
                    onChange={() => setSelectedVerdict("Pass")}
                    className="text-blue-500 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Scrutinized and passed. Clear candidate match without administrative linkage.
                </p>
              </label>

              {/* Option 4: Dismiss Overlap */}
              <label
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedVerdict === "Dismissed"
                    ? "border-rose-500 bg-rose-500/10 shadow-xs"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] hover:border-rose-500/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-[var(--text-primary)]">Dismiss</span>
                  <input
                    type="radio"
                    name="verdict"
                    value="Dismissed"
                    checked={selectedVerdict === "Dismissed"}
                    onChange={() => setSelectedVerdict("Dismissed")}
                    className="text-rose-500 focus:ring-rose-500"
                  />
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Spurious match signal. Dismiss candidate pair completely from active queue.
                </p>
              </label>
            </div>
          </div>

          {/* Reviewer Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="officer-input" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Adjudicating Scrutiny Officer
              </label>
              <input
                id="officer-input"
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 text-xs font-bold text-[var(--text-primary)] focus:border-[var(--primary-accent)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 shadow-2xs"
              />
            </div>
          </div>

          {/* Mandatory Rationale Note */}
          <div>
            <label htmlFor="rationale-input" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Mandatory Scrutiny Rationale *
            </label>
            <textarea
              id="rationale-input"
              rows={3}
              value={rationaleNote}
              onChange={(e) => setRationaleNote(e.target.value)}
              placeholder="Record explicit administrative justification for this finding (e.g. 'Both complaints target identical fee demands during admission; linked for joint inquiry under Approval Bureau')..."
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-accent)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 shadow-2xs font-medium"
              required
            />
          </div>

          {/* Institutional Directive */}
          <div>
            <label htmlFor="directive-input" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Institutional Directive / Statutory Order (Optional)
            </label>
            <input
              id="directive-input"
              type="text"
              value={institutionalDirective}
              onChange={(e) => setInstitutionalDirective(e.target.value)}
              placeholder="Record any formal directive or procedural order issued to the institution or bureau..."
              className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-accent)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 shadow-2xs font-medium"
            />
          </div>

          {/* Feedback Notice */}
          {feedback && (
            <div
              className={`p-3.5 rounded-lg text-xs border font-medium ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Submit Action Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
            <Link
              href="/overlap-review"
              className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel &amp; Return to Queue
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || selectedVerdict === "Pending"}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-accent)] px-5 py-2.5 text-xs font-bold text-white hover:bg-[var(--primary-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_var(--primary-accent-glow)] transition-all active:scale-98"
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
