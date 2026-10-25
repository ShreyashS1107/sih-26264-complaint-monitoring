"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useComplaints } from "../../lib/context/complaint-context";
import {
  IconLayers,
  IconSearch,
  IconChevronRight,
  IconCheckCircle,
  IconClock,
  IconBuilding,
  IconX,
  IconScale,
} from "../../components/ui/icons";
import { OverlapStatusBadge, Badge } from "../../components/ui/badge";
import { OverlapReviewStatus } from "../../lib/types";
import { AnimatedNumber } from "../../components/motion/animated-number";
import { fadeInUpVariants, staggerContainerVariants } from "../../lib/motion";

type SortOption = "score-desc" | "score-asc" | "pending-first";

function OverlapReviewQueueContent() {
  const { overlaps, complaints, pendingOverlapCount } = useComplaints();

  // Filter & Search states
  const [selectedStatus, setSelectedStatus] = useState<"all" | OverlapReviewStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("score-desc");

  // Derive counts
  const totalCount = overlaps.length;
  const linkedCount = useMemo(
    () => overlaps.filter((o) => o.reviewStatus === "Linked").length,
    [overlaps]
  );
  const independentCount = useMemo(
    () => overlaps.filter((o) => o.reviewStatus === "Independent").length,
    [overlaps]
  );
  const dismissedCount = useMemo(
    () => overlaps.filter((o) => o.reviewStatus === "Dismissed").length,
    [overlaps]
  );

  // Filter & Search logic
  const filteredOverlaps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return overlaps.filter((ovl) => {
      // Status filter
      if (selectedStatus !== "all" && ovl.reviewStatus !== selectedStatus) {
        return false;
      }

      // Search match
      if (q) {
        const sourceComplaint = complaints.find((c) => c.id === ovl.sourceComplaintId);
        const targetComplaint = complaints.find((c) => c.id === ovl.targetComplaintId);

        const matchesId = ovl.id.toLowerCase().includes(q);
        const matchesSourceId = ovl.sourceComplaintId.toLowerCase().includes(q);
        const matchesTargetId = ovl.targetComplaintId.toLowerCase().includes(q);
        const matchesSourceTitle = sourceComplaint?.title.toLowerCase().includes(q) || false;
        const matchesTargetTitle = targetComplaint?.title.toLowerCase().includes(q) || false;
        const matchesSourceInst = sourceComplaint?.institutionName.toLowerCase().includes(q) || false;
        const matchesTargetInst = targetComplaint?.institutionName.toLowerCase().includes(q) || false;

        if (
          !matchesId &&
          !matchesSourceId &&
          !matchesTargetId &&
          !matchesSourceTitle &&
          !matchesTargetTitle &&
          !matchesSourceInst &&
          !matchesTargetInst
        ) {
          return false;
        }
      }

      return true;
    });
  }, [overlaps, complaints, selectedStatus, searchQuery]);

  // Sort logic
  const sortedOverlaps = useMemo(() => {
    return [...filteredOverlaps].sort((a, b) => {
      switch (sortBy) {
        case "score-desc":
          return b.signalScore - a.signalScore;
        case "score-asc":
          return a.signalScore - b.signalScore;
        case "pending-first":
          if (a.reviewStatus === "Pending" && b.reviewStatus !== "Pending") return -1;
          if (a.reviewStatus !== "Pending" && b.reviewStatus === "Pending") return 1;
          return b.signalScore - a.signalScore;
        default:
          return 0;
      }
    });
  }, [filteredOverlaps, sortBy]);

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 1. Header & Institutional Oversight Banner */}
      <motion.div variants={fadeInUpVariants} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-[#E2DDD3]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#315EFB] bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 rounded-md">
              DECISION SUPPORT &bull; CORRELATION ARCHITECTURE
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
              Overlap Review Queue
            </h1>
            <Badge variant="warning" size="sm" className="font-mono">
              Advisory Signals
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#5A6474] max-w-2xl leading-relaxed">
            Multi-signal correlation queue analyzing grievance text, allegations, and respondent institutions. All algorithmic scores are advisory aids requiring human adjudication.
          </p>
        </div>

        {/* Action navigation */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <Link
            href="/complaints"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6CFC4] bg-white px-3.5 py-2 text-xs font-bold text-[#0F172A] hover:border-[#315EFB] hover:text-[#315EFB] shadow-2xs transition-all"
          >
            <span>Back to Registry</span>
            <IconChevronRight size={13} />
          </Link>
        </div>
      </motion.div>

      {/* 2. Executive Metric Cards Derived from Live State */}
      <motion.div variants={fadeInUpVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Candidate Pairs */}
        <div className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F4] p-4 shadow-[0_1px_3px_rgba(15,23,42,0.02)] hover:border-[#315EFB]/40 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#5A6474] uppercase tracking-wider">
            <span>Candidate Pairs</span>
            <span className="h-2 w-2 rounded-full bg-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tabular-nums text-[#0F172A] font-mono">
              <AnimatedNumber value={totalCount} />
            </span>
            <span className="text-[11px] text-[#5A6474]">total pairs</span>
          </div>
          <div className="mt-1 text-[11px] text-[#5A6474]">
            Algorithmic detections
          </div>
        </div>

        {/* Pending Adjudication */}
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFDF5] p-4 shadow-[0_1px_3px_rgba(15,23,42,0.02)] hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-amber-800 uppercase tracking-wider font-bold">
            <span>Pending Triage</span>
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tabular-nums text-amber-950 font-mono">
              <AnimatedNumber value={pendingOverlapCount} />
            </span>
            <span className="text-[11px] text-amber-800">unreviewed</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-800/80">
            Awaiting officer review
          </div>
        </div>

        {/* Confirmed Linked */}
        <div className="rounded-xl border border-[#C7D9FE] bg-[#F5F8FF] p-4 shadow-[0_1px_3px_rgba(15,23,42,0.02)] hover:border-[#315EFB] transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-blue-700 uppercase tracking-wider font-bold">
            <span>Linked as Related</span>
            <span className="h-2 w-2 rounded-full bg-[#315EFB]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tabular-nums text-blue-900 font-mono">
              <AnimatedNumber value={linkedCount} />
            </span>
            <span className="text-[11px] text-blue-700">correlated</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-700/80">
            Consolidated proceedings
          </div>
        </div>

        {/* Independent */}
        <div className="rounded-xl border border-[#A7F3D0] bg-[#F2FBF7] p-4 shadow-[0_1px_3px_rgba(15,23,42,0.02)] hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-800 uppercase tracking-wider font-bold">
            <span>Independent</span>
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tabular-nums text-emerald-950 font-mono">
              <AnimatedNumber value={independentCount} />
            </span>
            <span className="text-[11px] text-emerald-800">distinct</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-800/80">
            Parallel standalone cases
          </div>
        </div>
      </motion.div>

      {/* Statutory Human Oversight Mandate Box */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#BFDBFE] bg-gradient-to-r from-blue-50/80 to-indigo-50/40 p-4.5 flex items-start gap-3.5 text-xs text-[#0F172A] shadow-2xs">
        <div className="rounded-lg bg-[#315EFB] p-2 text-white shrink-0 mt-0.5 shadow-2xs">
          <IconScale size={16} />
        </div>
        <div className="leading-relaxed">
          <strong className="text-blue-950 font-bold block text-xs sm:text-sm">
            Statutory Human Oversight Mandate:
          </strong>
          <span className="text-slate-700 mt-0.5 block leading-relaxed">
            Algorithmic signal convergence measures textual and entity correlations across dossiers. It is strictly an advisory aid for officers. Dossiers are never automatically merged, modified, or closed by the algorithm without recorded human adjudication.
          </span>
        </div>
      </motion.div>

      {/* 3. Filter Tabs, Search & Sort Toolbar */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E2DDD3] bg-[#FAF8F4] p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.02)] space-y-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Review Status Filters">
            {[
              { id: "all", label: "All Candidates", count: totalCount },
              { id: "Pending", label: "Pending Review", count: pendingOverlapCount },
              { id: "Linked", label: "Linked as Related", count: linkedCount },
              { id: "Independent", label: "Confirmed Independent", count: independentCount },
              { id: "Dismissed", label: "Dismissed", count: dismissedCount },
            ].map((tab) => {
              const active = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatus(tab.id as "all" | OverlapReviewStatus)}
                  role="tab"
                  aria-selected={active}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-[#0F172A] text-white shadow-xs"
                      : "bg-white text-[#5A6474] hover:bg-[#F0ECE1] hover:text-[#0F172A] border border-[#D6CFC4] shadow-2xs"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-mono font-bold ${
                      active ? "bg-white/20 text-white" : "bg-[#FAF8F4] text-slate-800 border border-slate-200"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Search */}
            <div className="relative w-full sm:w-68">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <IconSearch size={15} />
              </div>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Pair ID, Case ID, Title..."
                className="h-9.5 w-full rounded-lg border border-[#D6CFC4] bg-white pl-9 pr-8 text-xs text-[#0F172A] placeholder:text-slate-400 focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 transition-all font-medium shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9.5 rounded-lg border border-[#D6CFC4] bg-white px-3 text-xs font-bold text-[#0F172A] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
            >
              <option value="score-desc">Highest Signal Score First</option>
              <option value="score-asc">Lowest Signal Score First</option>
              <option value="pending-first">Pending Reviews First</option>
            </select>
          </div>
        </div>

        {/* Results indicator */}
        <div className="flex items-center justify-between text-[11px] text-[#5A6474] pt-2 border-t border-[#F0ECE1]">
          <span>
            Showing <strong className="text-[#0F172A]">{sortedOverlaps.length}</strong> of{" "}
            <strong>{totalCount}</strong> candidate pairs
          </span>
          {(selectedStatus !== "all" || searchQuery !== "") && (
            <button
              type="button"
              onClick={() => {
                setSelectedStatus("all");
                setSearchQuery("");
              }}
              className="text-[#315EFB] font-bold hover:underline"
            >
              Reset filters &amp; search
            </button>
          )}
        </div>
      </motion.div>

      {/* 4. Candidate Pairs Presentation */}
      {sortedOverlaps.length === 0 ? (
        <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E3DFD5] bg-white p-14 text-center text-xs shadow-xs">
          <IconCheckCircle size={36} className="mx-auto text-emerald-600 mb-2" />
          <p className="font-bold text-sm text-[#0F172A]">No Candidate Overlaps Found</p>
          <p className="text-[#5A6474] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No candidate pairs match search query "${searchQuery}".`
              : `There are currently no candidates in the "${selectedStatus}" triage category.`}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedStatus("all");
              setSearchQuery("");
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-4 py-2 text-xs font-bold text-white hover:bg-[#254EDB] shadow-2xs transition-colors"
          >
            Reset Queue Filter
          </button>
        </motion.div>
      ) : (
        <motion.div variants={fadeInUpVariants} className="space-y-4">
          {sortedOverlaps.map((candidate) => {
            const source = complaints.find((c) => c.id === candidate.sourceComplaintId);
            const target = complaints.find((c) => c.id === candidate.targetComplaintId);

            return (
              <div
                key={candidate.id}
                className="rounded-xl border border-[#E2DDD3] bg-white p-5 sm:p-6 shadow-[0_1px_4px_rgba(15,23,42,0.03)] hover:border-[#315EFB]/50 hover:shadow-md transition-all space-y-4"
              >
                {/* Card Top Row: Pair ID, Signal Badge, Status Badge */}
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pb-3.5 border-b border-[#EAE5DA]">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-black tracking-wider text-[#0F172A] bg-[#FAF8F4] border border-[#E2DDD3] px-2.5 py-1 rounded-md">
                      {candidate.id}
                    </span>
                    <OverlapStatusBadge status={candidate.reviewStatus} />
                    <span className="text-xs text-slate-300">&bull;</span>
                    <span className="text-xs font-medium text-[#5A6474]">
                      {candidate.matchingSignals.length} Correlated Dimensions
                    </span>
                  </div>

                  {/* Signal Score Badge with Advisory Notice */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border font-mono ${
                        candidate.signalScore >= 80
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : candidate.signalScore >= 60
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-blue-50 text-blue-800 border-blue-200"
                      }`}
                      title="Algorithmic signal score only - not a final decision"
                    >
                      <IconLayers size={13} />
                      <span>{candidate.signalScore}% Advisory Signal</span>
                    </span>
                  </div>
                </div>

                {/* Candidate Dual Summary Comparison Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Source Case Box */}
                  <div className="rounded-xl bg-[#FAF8F4] p-4 border border-[#E2DDD3] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#315EFB] bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded">
                        {candidate.sourceComplaintId}
                      </span>
                      <span className="text-[11px] font-bold text-[#5A6474] uppercase tracking-wider font-mono">
                        Source Dossier
                      </span>
                    </div>
                    {source ? (
                      <>
                        <p className="text-xs sm:text-sm font-bold text-[#0F172A] line-clamp-1" title={source.title}>
                          {source.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5A6474] truncate">
                          <IconBuilding size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate font-medium">{source.institutionName}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="font-mono">{source.region}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Dossier details unavailable</p>
                    )}
                  </div>

                  {/* Target Case Box */}
                  <div className="rounded-xl bg-[#FAF8F4] p-4 border border-[#E2DDD3] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#315EFB] bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded">
                        {candidate.targetComplaintId}
                      </span>
                      <span className="text-[11px] font-bold text-[#5A6474] uppercase tracking-wider font-mono">
                        Target Dossier
                      </span>
                    </div>
                    {target ? (
                      <>
                        <p className="text-xs sm:text-sm font-bold text-[#0F172A] line-clamp-1" title={target.title}>
                          {target.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#5A6474] truncate">
                          <IconBuilding size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate font-medium">{target.institutionName}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="font-mono">{target.region}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Dossier details unavailable</p>
                    )}
                  </div>
                </div>

                {/* Signal Breakdown Tags */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#5A6474]">
                  <span className="font-bold text-[#0F172A] text-[11px] font-mono uppercase tracking-wider">
                    SIGNALS:
                  </span>
                  {candidate.matchingSignals.map((signal) => (
                    <span
                      key={signal.type}
                      className="inline-flex items-center rounded-md bg-[#FAF8F4] px-2 py-0.5 text-[11px] text-[#0F172A] border border-[#E2DDD3] shadow-2xs"
                    >
                      <strong className="text-slate-700 mr-1">{signal.type}:</strong> {signal.detail}
                    </span>
                  ))}
                </div>

                {/* Previous Adjudication Note (if already reviewed) */}
                {candidate.reviewStatus !== "Pending" && (
                  <div className="rounded-lg bg-emerald-50/50 p-3.5 border border-emerald-200 text-xs text-[#0F172A]">
                    <div className="flex items-center justify-between text-[11px] text-emerald-800 mb-1 font-mono">
                      <span className="font-bold">
                        Adjudicated by: {candidate.adjudicatedBy || "Authorized Officer"}
                      </span>
                      <span className="tabular-nums">{candidate.adjudicatedAt}</span>
                    </div>
                    <p className="text-xs text-slate-700 italic">
                      &ldquo;{candidate.adjudicationNote || "No specific note recorded."}&rdquo;
                    </p>
                  </div>
                )}

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-[#EAE5DA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-[11px] text-[#5A6474] flex items-center gap-1.5 font-medium">
                    <IconClock size={13} className="text-slate-400" />
                    <span>Clause-by-clause comparative examination required for final determination</span>
                  </span>

                  <Link
                    href={`/overlap-review/compare?source=${encodeURIComponent(
                      candidate.sourceComplaintId
                    )}&target=${encodeURIComponent(candidate.targetComplaintId)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#315EFB] px-4 py-2 text-xs font-bold text-white hover:bg-[#254EDB] shadow-2xs transition-all active:scale-98 self-start sm:self-auto"
                  >
                    <span>{candidate.reviewStatus === "Pending" ? "Review Pair & Adjudicate" : "Inspect Pair Comparison"}</span>
                    <IconChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function OverlapReviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#697386]">Loading overlap review queue...</div>}>
      <OverlapReviewQueueContent />
    </Suspense>
  );
}
