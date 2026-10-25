"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useComplaints } from "../../lib/context/complaint-context";
import {
  IconFileText,
  IconAlertTriangle,
  IconLayers,
  IconClock,
  IconArrowRight,
  IconChevronRight,
  IconBuilding,
  IconCheckCircle,
  IconScale,
} from "../ui/icons";
import { StatusBadge, PriorityBadge, Badge } from "../ui/badge";
import { BureauType, ComplaintStatus } from "../../lib/types";
import { AnimatedNumber } from "../motion/animated-number";
import { fadeInUpVariants, staggerContainerVariants } from "../../lib/motion";

const ALL_STATUSES: ComplaintStatus[] = [
  "Under Scrutiny",
  "Assigned to Bureau",
  "Show-Cause Notice Issued",
  "Institution Response Received",
  "Hearing Scheduled",
  "Escalated",
  "Resolved",
];

const ALL_BUREAUS: BureauType[] = [
  "Approval Bureau",
  "Anti-Ragging Cell",
  "Faculty Development Cell",
  "Student Grievance Cell",
  "Finance & Legal Cell",
];

export const OperationalDashboard: React.FC = () => {
  const { complaints, overlaps, auditLogs, pendingOverlapCount } = useComplaints();

  // 1. KPI Calculations derived strictly from state
  const totalComplaints = complaints.length;
  const activeComplaints = useMemo(
    () => complaints.filter((c) => c.status !== "Resolved"),
    [complaints]
  );
  const activeCount = activeComplaints.length;

  const criticalComplaints = useMemo(
    () => activeComplaints.filter((c) => c.priority === "Critical"),
    [activeComplaints]
  );
  const criticalCount = criticalComplaints.length;

  // 2. Status Distribution Calculations
  const statusDistribution = useMemo(() => {
    return ALL_STATUSES.map((status) => {
      const count = complaints.filter((c) => c.status === status).length;
      const percentage = totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0;
      return { status, count, percentage };
    });
  }, [complaints, totalComplaints]);

  // 3. Bureau Workload Calculations
  const bureauDistribution = useMemo(() => {
    return ALL_BUREAUS.map((bureau) => {
      const bureauCases = complaints.filter((c) => c.bureau === bureau);
      const total = bureauCases.length;
      const active = bureauCases.filter((c) => c.status !== "Resolved").length;
      const critical = bureauCases.filter(
        (c) => c.priority === "Critical" && c.status !== "Resolved"
      ).length;
      const percentage = totalComplaints > 0 ? Math.round((total / totalComplaints) * 100) : 0;
      return { bureau, total, active, critical, percentage };
    }).sort((a, b) => b.total - a.total);
  }, [complaints, totalComplaints]);

  // 4. Priority Queue / Attention Required (top active cases sorted by severity & recency)
  const attentionRequiredCases = useMemo(() => {
    const priorityWeights: Record<string, number> = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1,
    };

    return [...activeComplaints]
      .sort((a, b) => {
        const weightDiff = (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        if (weightDiff !== 0) return weightDiff;
        return new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime();
      })
      .slice(0, 5);
  }, [activeComplaints]);

  // 5. Pending Overlap Candidates (Awaiting human adjudication)
  const pendingOverlaps = useMemo(() => {
    return overlaps
      .filter((o) => o.reviewStatus === "Pending")
      .map((ovl) => {
        const source = complaints.find((c) => c.id === ovl.sourceComplaintId);
        const target = complaints.find((c) => c.id === ovl.targetComplaintId);
        return {
          ...ovl,
          source,
          target,
        };
      });
  }, [overlaps, complaints]);

  // 6. Recent Audit Events
  const recentActivity = useMemo(() => {
    return auditLogs.slice(0, 4);
  }, [auditLogs]);

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Heading & Institutional Context */}
      <motion.div variants={fadeInUpVariants} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#172033]">
              Institutional Oversight &amp; Grievance Overview
            </h2>
            <Badge variant="warning" size="sm">
              Demonstration Mode
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-[#697386]">
            AICTE Central Vigilance &amp; Redressal Dashboard &bull; Monitored Academic Cycle 2026&ndash;27
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/complaints"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#172033] hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <span>Complaint Registry</span>
            <IconArrowRight size={13} className="text-[#697386]" />
          </Link>
          <Link
            href="/overlap-review"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#254EDB] shadow-2xs transition-colors"
          >
            <span>Triage Overlaps</span>
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
              <AnimatedNumber value={pendingOverlapCount} duration={400} />
            </span>
          </Link>
        </div>
      </motion.div>

      {/* KPI Summary Row */}
      <motion.div variants={fadeInUpVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Total Complaints */}
        <Link
          href="/complaints"
          className="group block rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#315EFB]/50 hover:shadow-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#697386]">Total Intake Dossiers</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[#172033] group-hover:bg-blue-50 group-hover:text-[#315EFB] transition-colors">
              <IconFileText size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight tabular-nums text-[#172033]">
              <AnimatedNumber value={totalComplaints} />
            </span>
            <span className="text-xs text-[#697386]">cases recorded</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-[#697386]">
            <span>Across 5 AICTE Bureaus</span>
            <span className="font-semibold text-[#315EFB] group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              View all &rarr;
            </span>
          </div>
        </Link>

        {/* Metric 2: Active / Unresolved */}
        <Link
          href="/complaints"
          className="group block rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#315EFB]/50 hover:shadow-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#697386]">Active / Under Scrutiny</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#315EFB] transition-colors">
              <IconClock size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight tabular-nums text-[#172033]">
              <AnimatedNumber value={activeCount} />
            </span>
            <span className="text-xs text-[#697386]">
              ({totalComplaints > 0 ? Math.round((activeCount / totalComplaints) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-[#697386]">
            <span>Awaiting resolution or hearing</span>
            <span className="font-semibold text-[#315EFB] group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              Inspect &rarr;
            </span>
          </div>
        </Link>

        {/* Metric 3: Critical Priority Cases */}
        <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#C53B42]" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#991B1B]">Critical Urgency Cases</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-[#C53B42]">
              <IconAlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight tabular-nums text-[#C53B42]">
              <AnimatedNumber value={criticalCount} />
            </span>
            <span className="text-xs text-[#991B1B]">statutory SLA risk</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-rose-100 pt-2 text-[11px] text-[#991B1B]">
            <span>Ragging &amp; Capitation fee alerts</span>
            <span className="font-bold">Immediate action</span>
          </div>
        </div>

        {/* Metric 4: Pending Overlap Reviews */}
        <Link
          href="/overlap-review"
          className="group block rounded-xl border border-amber-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-amber-400 hover:shadow-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#B7791F]" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#92400E]">Pending Overlap Triage</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-[#B7791F]">
              <IconLayers size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold tracking-tight tabular-nums text-[#B7791F]">
              <AnimatedNumber value={pendingOverlapCount} />
            </span>
            <span className="text-xs text-[#92400E]">candidate pairs</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-amber-100 pt-2 text-[11px] text-[#92400E]">
            <span>Advisory signal match</span>
            <span className="font-bold text-[#B7791F] group-hover:translate-x-0.5 transition-transform inline-flex items-center">
              Adjudicate &rarr;
            </span>
          </div>
        </Link>
      </motion.div>

      {/* Workload & Status Distribution Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Grievance Lifecycle Progression */}
        <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">
                  Grievance Lifecycle Progression
                </h3>
                <p className="text-xs text-[#697386]">
                  Active procedural status across all registered cases
                </p>
              </div>
              <span className="text-xs font-bold tabular-nums text-[#697386]">
                {totalComplaints} Total Cases
              </span>
            </div>

            {/* Status Bars */}
            <div className="mt-4 space-y-3">
              {statusDistribution.map((item) => (
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
                  {/* Visual Bar */}
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
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#697386]">
            <span>Resolved: <strong className="text-emerald-700">{complaints.filter((c) => c.status === "Resolved").length}</strong> cases</span>
            <span>Unresolved: <strong className="text-slate-800">{activeCount}</strong> cases</span>
          </div>
        </motion.div>

        {/* Bureau Case Distribution */}
        <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">
                  Bureau Case Distribution
                </h3>
                <p className="text-xs text-[#697386]">
                  Jurisdictional allocation and pending scrutiny loads
                </p>
              </div>
              <span className="text-xs font-bold text-[#697386]">
                5 Apex Cells
              </span>
            </div>

            {/* Bureau List */}
            <div className="mt-4 space-y-3.5">
              {bureauDistribution.map((item) => (
                <div key={item.bureau} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#172033] truncate max-w-[200px] sm:max-w-[280px]">
                      {item.bureau}
                    </span>
                    <div className="flex items-center gap-2 tabular-nums text-xs">
                      {item.critical > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.2 text-[10px] font-bold bg-rose-50 text-[#C53B42] border border-rose-200">
                          {item.critical} Critical
                        </span>
                      )}
                      <span className="text-[#697386]">
                        <span className="font-bold text-[#172033]">{item.active}</span> active / {item.total} total
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-slate-700 transition-all duration-300"
                      style={{ width: `${Math.max(item.percentage, item.total > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#697386]">
            <span>Lead Volume: <strong>{bureauDistribution[0]?.bureau || "Approval Bureau"}</strong></span>
            <Link href="/complaints" className="text-[#315EFB] font-bold hover:underline">
              View Bureau Registry &rarr;
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Priority Queue, Overlap Review & Audit Stream */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Section E: Priority Queue / Attention Required (7 cols) */}
        <motion.div variants={fadeInUpVariants} className="lg:col-span-7 rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#172033]">
                  Priority Scrutiny Queue
                </h3>
                <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-[#C53B42] border border-rose-200">
                  {attentionRequiredCases.length} Requiring Action
                </span>
              </div>
              <p className="text-xs text-[#697386]">
                Active cases sorted by statutory urgency, statutory deadline &amp; priority
              </p>
            </div>
            <Link
              href="/complaints"
              className="text-xs font-bold text-[#315EFB] hover:underline shrink-0"
            >
              View all ({totalComplaints}) &rarr;
            </Link>
          </div>

          {attentionRequiredCases.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#697386]">
              <IconCheckCircle size={28} className="mx-auto mb-2 text-emerald-600" />
              <p className="font-bold text-[#172033]">No pending high-priority cases</p>
              <p className="text-slate-400 mt-0.5">All urgent grievances have been addressed</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attentionRequiredCases.map((c) => (
                <div
                  key={c.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 hover:bg-slate-50/80 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/complaints/${c.id}`}
                        className="font-mono text-xs font-bold text-[#315EFB] hover:underline"
                      >
                        {c.id}
                      </Link>
                      <PriorityBadge priority={c.priority} />
                      <StatusBadge status={c.status} />
                    </div>
                    <Link
                      href={`/complaints/${c.id}`}
                      className="block text-xs font-bold text-[#172033] hover:text-[#315EFB] transition-colors truncate"
                      title={c.title}
                    >
                      {c.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#697386]">
                      <span className="flex items-center gap-1 truncate max-w-[220px]">
                        <IconBuilding size={12} className="shrink-0 text-slate-400" />
                        <span className="truncate">{c.institutionName}</span>
                      </span>
                      <span>&bull;</span>
                      <span>{c.bureau}</span>
                      <span>&bull;</span>
                      <span className="tabular-nums font-medium">Due: {c.deadlineDate}</span>
                    </div>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    <Link
                      href={`/complaints/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-semibold text-[#172033] hover:bg-slate-100 hover:border-slate-300 shadow-2xs transition-colors"
                    >
                      <span>Dossier</span>
                      <IconChevronRight size={13} className="text-[#697386]" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Overlap Review Panel & Recent Activity */}
        <div className="lg:col-span-5 space-y-5">
          {/* Overlap Review Panel */}
          <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#172033]">
                    Candidate Overlap Queue
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-[#92400E] border border-amber-200">
                    {pendingOverlaps.length} Pending
                  </span>
                </div>
                <p className="text-xs text-[#697386]">
                  Multi-signal matches requiring human adjudication
                </p>
              </div>
              <Link
                href="/overlap-review"
                className="text-xs font-bold text-[#315EFB] hover:underline shrink-0"
              >
                Queue &rarr;
              </Link>
            </div>

            {pendingOverlaps.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#697386]">
                <IconCheckCircle size={24} className="mx-auto mb-1.5 text-emerald-600" />
                <p className="font-bold text-[#172033]">No pending overlap candidates</p>
                <p className="text-slate-400 mt-0.5">All algorithmic candidate matches have been reviewed</p>
              </div>
            ) : (
              <div className="mt-3.5 space-y-3">
                {pendingOverlaps.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-3.5 space-y-2 hover:border-slate-300 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#172033]">
                        {item.id}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-[#315EFB] border border-blue-200" title="Algorithmic signal score only - not a final decision">
                        <span>{item.signalScore}% Signal Match</span>
                      </span>
                    </div>

                    <div className="text-xs text-[#172033] flex items-center justify-between gap-2">
                      <div className="truncate flex-1">
                        <span className="font-mono font-bold text-[#315EFB]">{item.sourceComplaintId}</span>
                        <span className="text-slate-400 mx-1">&harr;</span>
                        <span className="font-mono font-bold text-[#315EFB]">{item.targetComplaintId}</span>
                      </div>
                      <span className="text-[10px] text-[#697386] shrink-0 font-medium">
                        {item.matchingSignals.length} signals
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 text-[10px] text-[#697386]">
                      {item.matchingSignals.slice(0, 2).map((sig) => (
                        <span
                          key={sig.type}
                          className="inline-block rounded-md bg-white px-1.5 py-0.5 border border-slate-200 truncate max-w-[240px]"
                        >
                          <span className="font-semibold text-slate-700">{sig.type}:</span> {sig.detail}
                        </span>
                      ))}
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Link
                        href={`/overlap-review/compare?source=${item.sourceComplaintId}&target=${item.targetComplaintId}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#315EFB] hover:text-[#254EDB]"
                      >
                        <span>Compare Side-by-Side</span>
                        <IconChevronRight size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Administrative Activity */}
          <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">
                  Recent Audit Activity
                </h3>
                <p className="text-xs text-[#697386]">
                  Verified administrative actions on dossiers
                </p>
              </div>
              <Link
                href="/audit-trail"
                className="text-xs font-bold text-[#315EFB] hover:underline"
              >
                Log &rarr;
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {recentActivity.map((log) => (
                <div key={log.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#172033] flex items-center gap-1.5">
                      <IconScale size={13} className="text-[#315EFB]" />
                      {log.action}
                    </span>
                    <span className="tabular-nums text-[#697386] font-medium">{log.timestamp}</span>
                  </div>
                  <p className="text-xs text-[#697386] line-clamp-1">
                    {log.details}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{log.actor}</span>
                    {log.complaintId && (
                      <Link
                        href={`/complaints/${log.complaintId}`}
                        className="font-mono font-bold text-[#315EFB] hover:underline"
                      >
                        {log.complaintId}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
