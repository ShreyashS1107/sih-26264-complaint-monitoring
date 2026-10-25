"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useComplaints } from "../../lib/context/complaint-context";
import {
  IconFileText,
  IconAlertTriangle,
  IconLayers,
  IconCheckCircle,
  IconBuilding,
  IconArrowRight,
  IconChevronRight,
  IconFilter,
} from "../../components/ui/icons";
import { PriorityBadge, StatusBadge, OverlapStatusBadge, Badge } from "../../components/ui/badge";
import { BureauType, ComplaintPriority, ComplaintStatus, OverlapReviewStatus } from "../../lib/types";
import { AnimatedNumber } from "../../components/motion/animated-number";
import { fadeInUpVariants, staggerContainerVariants } from "../../lib/motion";

const ALL_BUREAUS: BureauType[] = [
  "Approval Bureau",
  "Anti-Ragging Cell",
  "Faculty Development Cell",
  "Student Grievance Cell",
  "Finance & Legal Cell",
];

const ALL_STATUSES: ComplaintStatus[] = [
  "Under Scrutiny",
  "Assigned to Bureau",
  "Show-Cause Notice Issued",
  "Institution Response Received",
  "Hearing Scheduled",
  "Escalated",
  "Resolved",
];

const ALL_PRIORITIES: ComplaintPriority[] = ["Critical", "High", "Medium", "Low"];

const ALL_OVERLAP_STATUSES: OverlapReviewStatus[] = [
  "Pending",
  "Linked",
  "Independent",
  "Dismissed",
];

function AnalyticsContent() {
  const { complaints, overlaps } = useComplaints();

  // Bureau Filter state
  const [selectedBureau, setSelectedBureau] = useState<string>("all");

  // Filtered complaints based on bureau
  const scopedComplaints = useMemo(() => {
    if (selectedBureau === "all") return complaints;
    return complaints.filter((c) => c.bureau === selectedBureau);
  }, [complaints, selectedBureau]);

  // Overall KPI Metrics
  const totalComplaints = scopedComplaints.length;
  const activeComplaints = useMemo(
    () => scopedComplaints.filter((c) => c.status !== "Resolved"),
    [scopedComplaints]
  );
  const activeCount = activeComplaints.length;
  const resolvedCount = useMemo(
    () => scopedComplaints.filter((c) => c.status === "Resolved").length,
    [scopedComplaints]
  );
  const resolutionRate = totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 100) : 0;

  const criticalCount = useMemo(
    () => activeComplaints.filter((c) => c.priority === "Critical").length,
    [activeComplaints]
  );

  const pendingOverlapsCount = useMemo(
    () => overlaps.filter((o) => o.reviewStatus === "Pending").length,
    [overlaps]
  );

  // Status Distribution
  const statusStats = useMemo(() => {
    return ALL_STATUSES.map((status) => {
      const count = scopedComplaints.filter((c) => c.status === status).length;
      const percentage = totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0;
      return { status, count, percentage };
    });
  }, [scopedComplaints, totalComplaints]);

  // Priority Distribution
  const priorityStats = useMemo(() => {
    return ALL_PRIORITIES.map((priority) => {
      const count = scopedComplaints.filter((c) => c.priority === priority).length;
      const percentage = totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0;
      return { priority, count, percentage };
    });
  }, [scopedComplaints, totalComplaints]);

  // Bureau Workload Analysis
  const bureauAnalysis = useMemo(() => {
    return ALL_BUREAUS.map((bureau) => {
      const bComplaints = complaints.filter((c) => c.bureau === bureau);
      const total = bComplaints.length;
      const active = bComplaints.filter((c) => c.status !== "Resolved").length;
      const resolved = bComplaints.filter((c) => c.status === "Resolved").length;
      const critical = bComplaints.filter(
        (c) => c.priority === "Critical" && c.status !== "Resolved"
      ).length;
      const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

      return { bureau, total, active, resolved, critical, rate };
    }).sort((a, b) => b.total - a.total);
  }, [complaints]);

  // Overlap Triage Distribution
  const overlapStats = useMemo(() => {
    const total = overlaps.length;
    return ALL_OVERLAP_STATUSES.map((status) => {
      const count = overlaps.filter((o) => o.reviewStatus === status).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return { status, count, percentage };
    });
  }, [overlaps]);

  // Urgent active cases for quick drilldown
  const urgentCases = useMemo(() => {
    return [...activeComplaints]
      .filter((c) => c.priority === "Critical" || c.priority === "High")
      .slice(0, 4);
  }, [activeComplaints]);

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 1. Header & Context */}
      <motion.div variants={fadeInUpVariants} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-2 border-b border-[#E3DFD5]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#315EFB] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
              PERFORMANCE // VELOCITY
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
              Institutional Analytics &amp; Performance
            </h1>
            <Badge variant="warning" size="sm" className="font-mono">
              Live State
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#5A6474] max-w-2xl">
            Bureau workload distribution, case aging patterns, and procedural resolution velocity across AICTE statutory cells.
          </p>
        </div>

        {/* Bureau Scope Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#5A6474] font-bold font-mono">
            <IconFilter size={13} />
            <span>SCOPE:</span>
          </div>
          <select
            value={selectedBureau}
            onChange={(e) => setSelectedBureau(e.target.value)}
            className="h-10 rounded-lg border border-[#D5D0C3] bg-white px-3 text-xs font-bold text-[#0F172A] shadow-2xs focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20"
          >
            <option value="all">All AICTE Bureaus</option>
            {ALL_BUREAUS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Advisory Banner */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#BFDBFE] bg-gradient-to-r from-blue-50/70 to-indigo-50/30 p-4 text-xs text-[#0F172A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
        <span className="leading-relaxed">
          Metrics represent real-time session calculations derived from current institutional demonstration records ({totalComplaints} scoped dossiers).
        </span>
        <span className="font-bold text-slate-800 tabular-nums shrink-0 font-mono text-[11px] bg-white/70 px-2 py-0.5 rounded border border-blue-200">
          Academic Cycle 2026&ndash;27
        </span>
      </motion.div>

      {/* 2. KPI Summary Row */}
      <motion.div variants={fadeInUpVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-xs font-medium text-[#697386]">
            <span>Total Intake</span>
            <IconFileText size={16} className="text-[#315EFB]" />
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tabular-nums text-[#172033]">
            <AnimatedNumber value={totalComplaints} />
          </div>
          <span className="text-[11px] text-[#697386] mt-1 block">Registered dossiers</span>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-xs font-medium text-[#697386]">
            <span>Active Workload</span>
            <span className="h-2 w-2 rounded-full bg-[#315EFB] animate-pulse" />
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tabular-nums text-[#315EFB]">
            <AnimatedNumber value={activeCount} />
          </div>
          <span className="text-[11px] text-[#697386] mt-1 block">In scrutiny or hearing</span>
        </div>

        <div className="rounded-xl border border-rose-200 bg-white p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-xs font-bold text-[#991B1B]">
            <span>Critical SLA Risk</span>
            <IconAlertTriangle size={16} className="text-[#C53B42]" />
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tabular-nums text-[#C53B42]">
            <AnimatedNumber value={criticalCount} />
          </div>
          <span className="text-[11px] text-[#991B1B] mt-1 block">Immediate statutory alert</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-white p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-xs font-bold text-[#065F46]">
            <span>Resolution Rate</span>
            <IconCheckCircle size={16} className="text-[#168568]" />
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tabular-nums text-[#168568]">
            <AnimatedNumber value={resolutionRate} />%
          </div>
          <span className="text-[11px] text-[#065F46] mt-1 block">{resolvedCount} resolved cases</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-white p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-xs font-bold text-[#92400E]">
            <span>Pending Overlaps</span>
            <IconLayers size={16} className="text-[#B7791F]" />
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tabular-nums text-[#B7791F]">
            <AnimatedNumber value={pendingOverlapsCount} />
          </div>
          <span className="text-[11px] text-[#92400E] mt-1 block">Candidate pairs in queue</span>
        </div>
      </motion.div>

      {/* 3 & 5. Status & Priority Distribution Visualizations */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Status Distribution (7 cols) */}
        <motion.div variants={fadeInUpVariants} className="lg:col-span-7 rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-[#172033]">
                Procedural Lifecycle Distribution
              </h2>
              <p className="text-xs text-[#697386]">
                Distribution of dossiers across statutory scrutiny milestones
              </p>
            </div>
            <span className="text-xs font-bold tabular-nums text-[#697386]">
              {totalComplaints} Cases
            </span>
          </div>

          <div className="mt-4 space-y-3.5">
            {statusStats.map((item) => (
              <div key={item.status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#172033] flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        item.status === "Resolved"
                          ? "bg-emerald-500"
                          : item.status === "Escalated"
                          ? "bg-rose-500"
                          : item.status.includes("Notice") || item.status.includes("Hearing")
                          ? "bg-amber-500"
                          : "bg-[#315EFB]"
                      }`}
                    />
                    {item.status}
                  </span>
                  <span className="tabular-nums text-[#697386]">
                    <span className="font-bold text-[#172033]">{item.count}</span> ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      item.status === "Resolved"
                        ? "bg-[#168568]"
                        : item.status === "Escalated"
                        ? "bg-[#C53B42]"
                        : item.status.includes("Notice") || item.status.includes("Hearing")
                        ? "bg-[#B7791F]"
                        : "bg-[#315EFB]"
                    }`}
                    style={{ width: `${Math.max(item.percentage, item.count > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Priority Breakdown (5 cols) */}
        <motion.div variants={fadeInUpVariants} className="lg:col-span-5 rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-[#172033]">
                  Priority Stratification
                </h2>
                <p className="text-xs text-[#697386]">
                  Urgency classifications across scoped cases
                </p>
              </div>
              <span className="text-xs font-bold text-[#697386]">
                4 Tiers
              </span>
            </div>

            <div className="mt-4 space-y-3.5">
              {priorityStats.map((item) => (
                <div key={item.priority} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172033] flex items-center gap-2">
                      <PriorityBadge priority={item.priority} />
                    </span>
                    <span className="tabular-nums text-[#697386]">
                      <span className="font-bold text-[#172033]">{item.count}</span> ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.priority === "Critical"
                          ? "bg-[#C53B42]"
                          : item.priority === "High"
                          ? "bg-[#B7791F]"
                          : item.priority === "Medium"
                          ? "bg-[#315EFB]"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${Math.max(item.percentage, item.count > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-[#697386] flex items-center justify-between">
            <span>Critical urgency: <strong className="text-rose-700">{criticalCount}</strong> cases</span>
            <Link href="/complaints" className="text-[#315EFB] font-bold hover:underline">
              Inspect in Registry &rarr;
            </Link>
          </div>
        </motion.div>
      </div>

      {/* 4. Bureau Workload Analysis Table */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#172033]">
              Apex Bureau Workload &amp; Capacity Matrix
            </h2>
            <p className="text-xs text-[#697386]">
              Detailed case allocation, resolution percentages, and active statutory burdens across AICTE cells
            </p>
          </div>
          <span className="text-xs font-bold text-[#697386]">
            5 Functional Bureaus
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-[11px] font-bold text-[#697386] uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-4">AICTE Bureau</th>
                <th scope="col" className="py-3.5 px-4 text-center">Total Volume</th>
                <th scope="col" className="py-3.5 px-4 text-center">Active Cases</th>
                <th scope="col" className="py-3.5 px-4 text-center">Critical SLA</th>
                <th scope="col" className="py-3.5 px-4 text-center">Resolved</th>
                <th scope="col" className="py-3.5 px-4 text-center">Resolution Rate</th>
                <th scope="col" className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bureauAnalysis.map((b) => (
                <tr key={b.bureau} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#172033]">
                    <div className="flex items-center gap-2">
                      <IconBuilding size={14} className="text-[#315EFB] shrink-0" />
                      <span>{b.bureau}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center tabular-nums font-bold text-[#172033]">
                    {b.total}
                  </td>
                  <td className="py-3.5 px-4 text-center tabular-nums font-bold text-[#315EFB]">
                    {b.active}
                  </td>
                  <td className="py-3.5 px-4 text-center tabular-nums">
                    {b.critical > 0 ? (
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 font-bold text-[#C53B42] border border-rose-200">
                        {b.critical} Critical
                      </span>
                    ) : (
                      <span className="text-slate-400">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center tabular-nums font-semibold text-emerald-800">
                    {b.resolved}
                  </td>
                  <td className="py-3.5 px-4 text-center tabular-nums">
                    <span className="font-bold text-[#172033]">{b.rate}%</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/complaints?q=${encodeURIComponent(b.bureau)}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#172033] hover:border-[#315EFB] hover:text-[#315EFB] shadow-2xs transition-colors"
                    >
                      <span>Filter Cases</span>
                      <IconChevronRight size={11} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 6. Additional Insights: Overlap Triage & Urgent Attention Cases */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Overlap Adjudication Breakdown (5 cols) */}
        <motion.div variants={fadeInUpVariants} className="lg:col-span-5 rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-[#172033]">
                  Correlation Triage Status
                </h2>
                <p className="text-xs text-[#697386]">
                  Adjudication progress across candidate pairs
                </p>
              </div>
              <Link href="/overlap-review" className="text-xs font-bold text-[#315EFB] hover:underline">
                Queue &rarr;
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {overlapStats.map((item) => (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <OverlapStatusBadge status={item.status} />
                    </span>
                    <span className="tabular-nums text-[#697386]">
                      <span className="font-bold text-[#172033]">{item.count}</span> ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.status === "Pending"
                          ? "bg-[#B7791F]"
                          : item.status === "Linked"
                          ? "bg-[#315EFB]"
                          : item.status === "Independent"
                          ? "bg-[#168568]"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${Math.max(item.percentage, item.count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#697386]">
            <span>Pending review: <strong className="text-amber-800">{pendingOverlapsCount}</strong> pairs</span>
            <Link
              href="/overlap-review"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#315EFB] hover:text-[#254EDB]"
            >
              <span>Launch Triage Workspace</span>
              <IconArrowRight size={13} />
            </Link>
          </div>
        </motion.div>

        {/* High-Priority Active Cases Spotlight (7 cols) */}
        <motion.div variants={fadeInUpVariants} className="lg:col-span-7 rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-[#172033]">
                  Immediate Scrutiny Spotlight
                </h2>
                <p className="text-xs text-[#697386]">
                  Active critical and high priority cases requiring administrative action
                </p>
              </div>
              <Link href="/complaints" className="text-xs font-bold text-[#315EFB] hover:underline">
                Registry &rarr;
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {urgentCases.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#697386]">
                  No active critical cases requiring immediate action.
                </div>
              ) : (
                urgentCases.map((c) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/complaints/${c.id}`}
                          className="font-mono font-bold text-[#315EFB] hover:underline"
                        >
                          {c.id}
                        </Link>
                        <PriorityBadge priority={c.priority} />
                        <StatusBadge status={c.status} />
                      </div>
                      <Link
                        href={`/complaints/${c.id}`}
                        className="block text-xs font-bold text-[#172033] hover:text-[#315EFB] truncate"
                        title={c.title}
                      >
                        {c.title}
                      </Link>
                      <div className="text-[11px] text-[#697386] truncate">
                        {c.institutionName} &bull; Due: <span className="text-[#C53B42] font-bold tabular-nums">{c.deadlineDate}</span>
                      </div>
                    </div>

                    <Link
                      href={`/complaints/${c.id}`}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-semibold text-[#172033] hover:bg-slate-50 shadow-2xs transition-colors"
                    >
                      <span>Dossier</span>
                      <IconChevronRight size={12} />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-[#697386]">
            Showing top {urgentCases.length} highest urgency cases
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#697386]">Loading institutional analytics...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
