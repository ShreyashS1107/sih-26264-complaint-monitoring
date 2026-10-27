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
      <motion.div variants={fadeInUpVariants} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--primary-accent)] bg-[var(--primary-accent)]/10 border border-[var(--primary-accent)]/25 px-2 py-0.5 rounded shadow-[0_0_12px_var(--primary-accent-glow)]">
              PERFORMANCE // VELOCITY
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Institutional Analytics &amp; Performance
            </h1>
            <Badge variant="warning" size="sm" className="font-mono">
              Live State
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] max-w-2xl">
            Bureau workload distribution, case aging patterns, and procedural resolution velocity across AICTE statutory cells.
          </p>
        </div>

        {/* Bureau Scope Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-bold font-mono">
            <IconFilter size={13} />
            <span>SCOPE:</span>
          </div>
          <select
            value={selectedBureau}
            onChange={(e) => setSelectedBureau(e.target.value)}
            className="h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-xs font-bold text-[var(--text-primary)] shadow-2xs focus:border-[var(--primary-accent)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 transition-colors"
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
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[var(--primary-accent)]/30 bg-gradient-to-r from-[var(--primary-accent)]/10 via-[var(--bg-surface)] to-[var(--bg-surface)] p-4 text-xs text-[var(--text-primary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
        <span className="leading-relaxed">
          Metrics represent real-time session calculations derived from current institutional demonstration records ({totalComplaints} scoped dossiers).
        </span>
        <span className="font-bold tabular-nums shrink-0 font-mono text-[11px] bg-[var(--bg-surface)] text-[var(--text-primary)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
          Academic Cycle 2026&ndash;27
        </span>
      </motion.div>

      {/* 2. KPI Summary Row */}
      <motion.div variants={fadeInUpVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4.5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:border-[var(--primary-accent)]/40 transition-all">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
            <span>Total Intake</span>
            <IconFileText size={16} className="text-[var(--primary-accent)]" />
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tabular-nums text-[var(--text-primary)]">
            <AnimatedNumber value={totalComplaints} />
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">Registered dossiers</span>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4.5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:border-[var(--primary-accent)]/50 transition-all">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)]">
            <span>Active Workload</span>
            <span className="h-2 w-2 rounded-full bg-[var(--primary-accent)] animate-pulse shadow-[0_0_8px_var(--primary-accent-glow)]" />
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tabular-nums text-[var(--primary-accent)]">
            <AnimatedNumber value={activeCount} />
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">In scrutiny or hearing</span>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-[var(--bg-surface)] p-4.5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:border-rose-500/50 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-rose-500">
            <span>Critical SLA Risk</span>
            <IconAlertTriangle size={16} className="text-rose-500" />
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tabular-nums text-rose-500">
            <AnimatedNumber value={criticalCount} />
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">Immediate statutory alert</span>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-[var(--bg-surface)] p-4.5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-500">
            <span>Resolution Rate</span>
            <IconCheckCircle size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tabular-nums text-emerald-500">
            <AnimatedNumber value={resolutionRate} />%
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">{resolvedCount} resolved cases</span>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-[var(--bg-surface)] p-4.5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between text-xs font-bold text-amber-500">
            <span>Pending Overlaps</span>
            <IconLayers size={16} className="text-amber-500" />
          </div>
          <div className="mt-2.5 text-2xl font-extrabold tabular-nums text-amber-500">
            <AnimatedNumber value={pendingOverlapsCount} />
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] mt-1 block">Candidate pairs in queue</span>
        </div>
      </motion.div>

      {/* 3 & 5. Status & Priority Distribution Visualizations */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Status Distribution (7 cols) */}
        <motion.div variants={fadeInUpVariants} className="lg:col-span-7 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Procedural Lifecycle Distribution
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Distribution of dossiers across statutory scrutiny milestones
              </p>
            </div>
            <span className="text-xs font-bold tabular-nums text-[var(--text-secondary)]">
              {totalComplaints} Cases
            </span>
          </div>

          <div className="mt-4 space-y-3.5">
            {statusStats.map((item) => (
              <div key={item.status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        item.status === "Resolved"
                          ? "bg-emerald-500"
                          : item.status === "Escalated"
                          ? "bg-rose-500"
                          : item.status.includes("Notice") || item.status.includes("Hearing")
                          ? "bg-amber-500"
                          : "bg-[var(--primary-accent)]"
                      }`}
                    />
                    {item.status}
                  </span>
                  <span className="tabular-nums text-[var(--text-secondary)]">
                    <span className="font-bold text-[var(--text-primary)]">{item.count}</span> ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      item.status === "Resolved"
                        ? "bg-emerald-500"
                        : item.status === "Escalated"
                        ? "bg-rose-500"
                        : item.status.includes("Notice") || item.status.includes("Hearing")
                        ? "bg-amber-500"
                        : "bg-[var(--primary-accent)] shadow-[0_0_8px_var(--primary-accent-glow)]"
                    }`}
                    style={{ width: `${Math.max(item.percentage, item.count > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Priority Breakdown (5 cols) */}
        <motion.div variants={fadeInUpVariants} className="lg:col-span-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Priority Stratification
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Urgency classifications across scoped cases
                </p>
              </div>
              <span className="text-xs font-bold text-[var(--text-secondary)]">
                4 Tiers
              </span>
            </div>

            <div className="mt-4 space-y-3.5">
              {priorityStats.map((item) => (
                <div key={item.priority} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <PriorityBadge priority={item.priority} />
                    </span>
                    <span className="tabular-nums text-[var(--text-secondary)]">
                      <span className="font-bold text-[var(--text-primary)]">{item.count}</span> ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.priority === "Critical"
                          ? "bg-rose-500"
                          : item.priority === "High"
                          ? "bg-amber-500"
                          : item.priority === "Medium"
                          ? "bg-[var(--primary-accent)] shadow-[0_0_8px_var(--primary-accent-glow)]"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${Math.max(item.percentage, item.count > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
            <span>Critical urgency: <strong className="text-rose-500">{criticalCount}</strong> cases</span>
            <Link href="/complaints" className="text-[var(--primary-accent)] font-bold hover:underline">
              Inspect in Registry &rarr;
            </Link>
          </div>
        </motion.div>
      </div>

      {/* 4. Bureau Workload Analysis Table */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[0_4px_20px_rgba(0,0,0,0.15)] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Apex Bureau Workload &amp; Capacity Matrix
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Detailed case allocation, resolution percentages, and active statutory burdens across AICTE cells
            </p>
          </div>
          <span className="text-xs font-bold text-[var(--text-secondary)]">
            5 Functional Bureaus
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                <th scope="col" className="py-3.5 px-4">AICTE Bureau</th>
                <th scope="col" className="py-3.5 px-4 text-center">Total Volume</th>
                <th scope="col" className="py-3.5 px-4 text-center">Active Cases</th>
                <th scope="col" className="py-3.5 px-4 text-center">Critical SLA</th>
                <th scope="col" className="py-3.5 px-4 text-center">Resolved</th>
                <th scope="col" className="py-3.5 px-4 text-center">Resolution Rate</th>
                <th scope="col" className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {bureauAnalysis.map((b) => (
                <tr key={b.bureau} className="hover:bg-[var(--bg-surface-subtle)]/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[var(--text-primary)]">
                    <div className="flex items-center gap-2">
                      <IconBuilding size={14} className="text-[var(--primary-accent)] shrink-0" />
                      <span>{b.bureau}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center tabular-nums font-bold text-[var(--text-primary)]">
                    {b.total}
                  </td>
                  <td className="py-3.5 px-4 text-center tabular-nums font-bold text-[var(--primary-accent)]">
                    {b.active}
                  </td>
                  <td className="py-3.5 px-4 text-center tabular-nums">
                    {b.critical > 0 ? (
                      <span className="rounded-md bg-rose-500/15 px-2 py-0.5 font-bold text-rose-500 border border-rose-500/30">
                        {b.critical} Critical
                      </span>
                    ) : (
                      <span className="text-slate-500">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center tabular-nums font-semibold text-emerald-500">
                    {b.resolved}
                  </td>
                  <td className="py-3.5 px-4 text-center tabular-nums">
                    <span className="font-bold text-[var(--text-primary)]">{b.rate}%</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/complaints?q=${encodeURIComponent(b.bureau)}`}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] hover:border-[var(--primary-accent)] hover:text-[var(--primary-accent)] shadow-2xs transition-colors"
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
        <motion.div variants={fadeInUpVariants} className="lg:col-span-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Correlation Triage Status
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Adjudication progress across candidate pairs
                </p>
              </div>
              <Link href="/overlap-review" className="text-xs font-bold text-[var(--primary-accent)] hover:underline">
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
                    <span className="tabular-nums text-[var(--text-secondary)]">
                      <span className="font-bold text-[var(--text-primary)]">{item.count}</span> ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--bg-surface-subtle)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === "Pending"
                          ? "bg-amber-500"
                          : item.status === "Linked"
                          ? "bg-[var(--primary-accent)] shadow-[0_0_8px_var(--primary-accent-glow)]"
                          : item.status === "Independent"
                          ? "bg-emerald-500"
                          : "bg-slate-500"
                      }`}
                      style={{ width: `${Math.max(item.percentage, item.count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span>Pending review: <strong className="text-amber-500">{pendingOverlapsCount}</strong> pairs</span>
            <Link
              href="/overlap-review"
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary-accent)] hover:underline"
            >
              <span>Launch Triage Workspace</span>
              <IconArrowRight size={13} />
            </Link>
          </div>
        </motion.div>

        {/* High-Priority Active Cases Spotlight (7 cols) */}
        <motion.div variants={fadeInUpVariants} className="lg:col-span-7 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Immediate Scrutiny Spotlight
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Active critical and high priority cases requiring administrative action
                </p>
              </div>
              <Link href="/complaints" className="text-xs font-bold text-[var(--primary-accent)] hover:underline">
                Registry &rarr;
              </Link>
            </div>

            <div className="mt-3 divide-y divide-[var(--border-subtle)]">
              {urgentCases.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
                  No active critical cases requiring immediate action.
                </div>
              ) : (
                urgentCases.map((c) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/complaints/${c.id}`}
                          className="font-mono font-bold text-[var(--primary-accent)] hover:underline"
                        >
                          {c.id}
                        </Link>
                        <PriorityBadge priority={c.priority} />
                        <StatusBadge status={c.status} />
                      </div>
                      <Link
                        href={`/complaints/${c.id}`}
                        className="block text-xs font-bold text-[var(--text-primary)] hover:text-[var(--primary-accent)] truncate"
                        title={c.title}
                      >
                        {c.title}
                      </Link>
                      <div className="text-[11px] text-[var(--text-secondary)] truncate">
                        {c.institutionName} &bull; Due: <span className="text-rose-500 font-bold tabular-nums">{c.deadlineDate}</span>
                      </div>
                    </div>

                    <Link
                      href={`/complaints/${c.id}`}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--primary-accent)] hover:text-[var(--primary-accent)] shadow-2xs transition-colors"
                    >
                      <span>Dossier</span>
                      <IconChevronRight size={12} />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
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
