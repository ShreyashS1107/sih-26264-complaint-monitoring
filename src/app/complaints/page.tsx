"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useComplaints } from "../../lib/context/complaint-context";
import {
  IconSearch,
  IconFilter,
  IconChevronRight,
  IconX,
  IconBuilding,
  IconCheckCircle,
  IconAlertTriangle,
  IconClock,
  IconChevronLeft,
} from "../../components/ui/icons";
import { StatusBadge, PriorityBadge, Badge } from "../../components/ui/badge";
import { BureauType, ComplaintPriority, ComplaintStatus } from "../../lib/types";
import { AnimatedNumber } from "../../components/motion/animated-number";
import { fadeInUpVariants, staggerContainerVariants } from "../../lib/motion";

type SortOption = "date-desc" | "date-asc" | "priority-desc" | "priority-asc" | "deadline-asc";

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

const ALL_REGIONS = [
  "Western",
  "Northern",
  "South-Western",
  "North-Western",
  "Southern",
  "Central",
  "Eastern",
];

function ComplaintRegistryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { complaints } = useComplaints();

  // Search state initialized from URL param `q` if present
  const urlQuery = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);

  // Sync with URL query parameter changes if user navigates via header search
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setSearchQuery(urlQuery);
  }

  // Filter states
  const [selectedBureau, setSelectedBureau] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Derive counts
  const totalCount = complaints.length;
  const activeCount = useMemo(
    () => complaints.filter((c) => c.status !== "Resolved").length,
    [complaints]
  );
  const criticalCount = useMemo(
    () => complaints.filter((c) => c.priority === "Critical" && c.status !== "Resolved").length,
    [complaints]
  );
  const resolvedCount = useMemo(
    () => complaints.filter((c) => c.status === "Resolved").length,
    [complaints]
  );

  // Filter & Search logic
  const filteredComplaints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return complaints.filter((c) => {
      // Search matching
      if (q) {
        const matchesId = c.id.toLowerCase().includes(q);
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesInst = c.institutionName.toLowerCase().includes(q) || c.institutionId.toLowerCase().includes(q);
        const matchesBureau = c.bureau.toLowerCase().includes(q);
        const matchesRegion = c.region.toLowerCase().includes(q) || c.state.toLowerCase().includes(q);
        const matchesDesc = c.description.toLowerCase().includes(q);

        if (!matchesId && !matchesTitle && !matchesInst && !matchesBureau && !matchesRegion && !matchesDesc) {
          return false;
        }
      }

      // Bureau filter
      if (selectedBureau !== "all" && c.bureau !== selectedBureau) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all" && c.status !== selectedStatus) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== "all" && c.priority !== selectedPriority) {
        return false;
      }

      // Region filter
      if (selectedRegion !== "all" && c.region !== selectedRegion) {
        return false;
      }

      return true;
    });
  }, [complaints, searchQuery, selectedBureau, selectedStatus, selectedPriority, selectedRegion]);

  // Sort logic
  const sortedComplaints = useMemo(() => {
    const priorityWeight: Record<ComplaintPriority, number> = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1,
    };

    return [...filteredComplaints].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime();
        case "date-asc":
          return new Date(a.filingDate).getTime() - new Date(b.filingDate).getTime();
        case "priority-desc":
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        case "priority-asc":
          return priorityWeight[a.priority] - priorityWeight[b.priority];
        case "deadline-asc":
          return new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime();
        default:
          return 0;
      }
    });
  }, [filteredComplaints, sortBy]);

  // Pagination logic with automatic bounds clamp
  const totalPages = Math.max(1, Math.ceil(sortedComplaints.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedComplaints = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedComplaints.slice(start, start + pageSize);
  }, [sortedComplaints, safePage, pageSize]);

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedBureau !== "all" ||
    selectedStatus !== "all" ||
    selectedPriority !== "all" ||
    selectedRegion !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedBureau("all");
    setSelectedStatus("all");
    setSelectedPriority("all");
    setSelectedRegion("all");
    setSortBy("date-desc");
    router.replace("/complaints");
  };

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 1. Header & Institutional Oversight Banner */}
      <motion.div variants={fadeInUpVariants} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--primary-accent)] bg-[var(--primary-accent-subtle)] border border-[var(--primary-accent)]/30 px-2.5 py-0.5 rounded-md">
              CENTRAL VIGILANCE &bull; REGISTRY
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Institutional Complaint Registry
            </h1>
            <Badge variant="neutral" size="sm" className="font-mono">
              Live Intake Queue
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
            Statutory grievance repository across all 5 AICTE apex bureaus with real-time procedural status tracking, SLA monitoring, and dossier inspection.
          </p>
        </div>

        {/* Quick Route Shortcuts */}
        <div className="flex items-center gap-2.5 self-start lg:self-center">
          <Link
            href="/overlap-review"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--primary-accent)]/50 hover:text-[var(--primary-accent)] shadow-2xs transition-all"
          >
            <span>Overlap Review</span>
            <IconChevronRight size={13} />
          </Link>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--primary-accent-hover)] shadow-[0_0_15px_var(--primary-accent-glow)] transition-all"
          >
            <span>Analytics</span>
            <IconChevronRight size={13} />
          </Link>
        </div>
      </motion.div>

      {/* 2. Executive Metric Cards Derived from Live State */}
      <motion.div variants={fadeInUpVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Ingest */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-xs hover:border-[var(--primary-accent)]/40 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
            <span>Total Intake</span>
            <span className="h-2 w-2 rounded-full bg-[var(--text-muted)]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tabular-nums text-[var(--text-primary)] font-mono">
              <AnimatedNumber value={totalCount} />
            </span>
            <span className="text-[11px] text-[var(--text-secondary)]">dossiers</span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            Complete institutional repository
          </div>
        </div>

        {/* Active Scrutiny */}
        <div className="rounded-xl border border-[var(--primary-accent)]/30 bg-[var(--primary-accent-subtle)] p-4 shadow-xs hover:border-[var(--primary-accent)] transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--primary-accent)] uppercase tracking-wider font-bold">
            <span>Active in Scrutiny</span>
            <span className="h-2 w-2 rounded-full bg-[var(--primary-accent)] animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tabular-nums text-[var(--primary-accent)] font-mono">
              <AnimatedNumber value={activeCount} />
            </span>
            <span className="text-[11px] text-[var(--primary-accent)]/80">underway</span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--primary-accent)]/70">
            Pending bureau determination
          </div>
        </div>

        {/* Critical Risk */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 shadow-xs hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-rose-500 uppercase tracking-wider font-bold">
            <span>Critical Priority</span>
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tabular-nums text-rose-500 font-mono">
              <AnimatedNumber value={criticalCount} />
            </span>
            <span className="text-[11px] text-rose-400">urgent</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-400/80">
            SLA enforcement required
          </div>
        </div>

        {/* Procedural Closure */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-xs hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-emerald-500 uppercase tracking-wider font-bold">
            <span>Closed / Resolved</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tabular-nums text-emerald-500 font-mono">
              <AnimatedNumber value={resolvedCount} />
            </span>
            <span className="text-[11px] text-emerald-400">completed</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-400/80">
            Full compliance established
          </div>
        </div>
      </motion.div>

      {/* 3. Refined Search & Filter Toolbar */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Row 1: Search & Sort Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Refined Search Field */}
          <div className="relative flex-1 max-w-xl">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-muted)]">
              <IconSearch size={16} />
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case ID, Institution, Allegation keywords, Bureau..."
              className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] pl-10 pr-9 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-accent)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 transition-all font-medium shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Clear search"
              >
                <IconX size={15} />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 text-xs text-[var(--text-primary)] font-bold focus:border-[var(--primary-accent)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 shadow-2xs transition-all"
            >
              <option value="date-desc">Newest Received</option>
              <option value="date-asc">Oldest Received</option>
              <option value="priority-desc">Highest Priority First</option>
              <option value="priority-asc">Lowest Priority First</option>
              <option value="deadline-asc">Deadline Approaching</option>
            </select>
          </div>
        </div>

        {/* Row 2: Multi-Facet Filter Controls */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-bold mr-1 uppercase tracking-wider font-mono">
            <IconFilter size={13} />
            <span>FACETS:</span>
          </div>

          {/* Bureau Filter */}
          <select
            value={selectedBureau}
            onChange={(e) => setSelectedBureau(e.target.value)}
            className="h-8.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 text-xs text-[var(--text-primary)] font-medium focus:border-[var(--primary-accent)] focus:outline-hidden shadow-2xs"
          >
            <option value="all">All Bureaus ({ALL_BUREAUS.length})</option>
            {ALL_BUREAUS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-8.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 text-xs text-[var(--text-primary)] font-medium focus:border-[var(--primary-accent)] focus:outline-hidden shadow-2xs"
          >
            <option value="all">All Statuses ({ALL_STATUSES.length})</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="h-8.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 text-xs text-[var(--text-primary)] font-medium focus:border-[var(--primary-accent)] focus:outline-hidden shadow-2xs"
          >
            <option value="all">All Priorities</option>
            {ALL_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p} Priority
              </option>
            ))}
          </select>

          {/* Region Filter */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="h-8.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-2.5 text-xs text-[var(--text-primary)] font-medium focus:border-[var(--primary-accent)] focus:outline-hidden shadow-2xs"
          >
            <option value="all">All Regions</option>
            {ALL_REGIONS.map((r) => (
              <option key={r} value={r}>
                {r} Region
              </option>
            ))}
          </select>

          {/* Active Filter Clear Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors ml-auto border border-rose-500/30 shadow-2xs"
            >
              <IconX size={13} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Selected Filter Pills Tag Row */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-[var(--text-secondary)] font-semibold">Active Criteria:</span>
            {selectedBureau !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--primary-accent-subtle)] px-2 py-0.5 text-[var(--primary-accent)] border border-[var(--primary-accent)]/30">
                <span>Bureau: {selectedBureau}</span>
                <button
                  type="button"
                  onClick={() => setSelectedBureau("all")}
                  className="hover:opacity-80"
                >
                  <IconX size={10} />
                </button>
              </span>
            )}
            {selectedStatus !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-0.5 text-indigo-400 border border-indigo-500/30">
                <span>Status: {selectedStatus}</span>
                <button
                  type="button"
                  onClick={() => setSelectedStatus("all")}
                  className="hover:opacity-80"
                >
                  <IconX size={10} />
                </button>
              </span>
            )}
            {selectedPriority !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-400 border border-amber-500/30">
                <span>Priority: {selectedPriority}</span>
                <button
                  type="button"
                  onClick={() => setSelectedPriority("all")}
                  className="hover:opacity-80"
                >
                  <IconX size={10} />
                </button>
              </span>
            )}
            {selectedRegion !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-surface-elevated)] px-2 py-0.5 text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                <span>Region: {selectedRegion}</span>
                <button
                  type="button"
                  onClick={() => setSelectedRegion("all")}
                  className="hover:text-[var(--text-primary)]"
                >
                  <IconX size={10} />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-surface-elevated)] px-2 py-0.5 text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                <span>Query: &ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="hover:text-[var(--text-primary)]"
                >
                  <IconX size={10} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Filter Status Indicator */}
        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)] font-mono">
          <span>
            Displaying <strong className="text-[var(--text-primary)]">{sortedComplaints.length}</strong> matching records out of{" "}
            <strong className="text-[var(--text-primary)]">{totalCount}</strong> total institutional complaints
          </span>
          {hasActiveFilters && (
            <span className="text-amber-500 font-bold text-[10px]">FILTER APPLIED</span>
          )}
        </div>
      </motion.div>

      {/* 4 & 5. High-Scanability Complaint Data Table */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs overflow-hidden">
        {sortedComplaints.length === 0 ? (
          <div className="py-20 text-center text-xs">
            {totalCount === 0 ? (
              <div className="space-y-2 text-[var(--text-secondary)]">
                <IconCheckCircle size={36} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-sm text-[var(--text-primary)]">Registry Database Empty</p>
                <p>The institutional intake database currently contains no complaint records.</p>
              </div>
            ) : (
              <div className="space-y-2 text-[var(--text-secondary)] max-w-md mx-auto px-4">
                <IconAlertTriangle size={36} className="mx-auto text-amber-500 mb-2" />
                <p className="font-bold text-sm text-[var(--text-primary)]">No Matching Complaints Found</p>
                <p>No grievances match the search filter criteria. Try adjusting your query or resetting facet filters.</p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--primary-accent-hover)] transition-colors shadow-[0_0_15px_var(--primary-accent-glow)]"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="Complaints Table">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[10px] font-mono font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4">CASE ID</th>
                  <th scope="col" className="py-3 px-4">GRIEVANCE &bull; INSTITUTION</th>
                  <th scope="col" className="py-3 px-4">BUREAU</th>
                  <th scope="col" className="py-3 px-4">PRIORITY</th>
                  <th scope="col" className="py-3 px-4">STATUS</th>
                  <th scope="col" className="py-3 px-4">RECEIVED &bull; DEADLINE</th>
                  <th scope="col" className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {paginatedComplaints.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/complaints/${c.id}`)}
                    className="hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer group border-l-3 border-transparent hover:border-[var(--primary-accent)]"
                  >
                    {/* Case ID */}
                    <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                      <Link
                        href={`/complaints/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5"
                      >
                        <span className="rounded-md bg-[var(--primary-accent-subtle)] border border-[var(--primary-accent)]/30 px-2.5 py-1 text-xs text-[var(--primary-accent)] font-bold group-hover:bg-[var(--primary-accent)] group-hover:text-white transition-all shadow-2xs">
                          {c.id}
                        </span>
                      </Link>
                    </td>

                    {/* Complaint & Institution Details */}
                    <td className="py-3.5 px-4 min-w-[280px] max-w-md">
                      <div className="font-bold text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--primary-accent)] transition-colors" title={c.title}>
                        {c.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] mt-1">
                        <IconBuilding size={12} className="shrink-0 text-[var(--text-muted)]" />
                        <span className="truncate font-medium">{c.institutionName}</span>
                        <span className="opacity-40">&bull;</span>
                        <span className="shrink-0 rounded bg-[var(--bg-surface-elevated)] px-1.5 py-0.2 text-[10px] text-[var(--text-secondary)] font-mono border border-[var(--border-subtle)]">
                          {c.region}
                        </span>
                      </div>
                    </td>

                    {/* Bureau */}
                    <td className="py-3.5 px-4 text-[var(--text-primary)] whitespace-nowrap">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">{c.bureau}</span>
                    </td>

                    {/* Priority Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={c.priority} />
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>

                    {/* Received Date & Due */}
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                      <div className="tabular-nums font-bold text-[var(--text-primary)] font-mono text-[11px]">{c.filingDate}</div>
                      <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5 font-mono">
                        <IconClock size={10} className="text-[var(--text-muted)]" />
                        <span>Due: {c.deadlineDate}</span>
                      </div>
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/complaints/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] group-hover:border-[var(--primary-accent)] group-hover:bg-[var(--primary-accent)] group-hover:text-white shadow-2xs transition-all"
                      >
                        <span>Dossier</span>
                        <IconChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Pagination Footer */}
        {sortedComplaints.length > 0 && (
          <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <div>
              Showing <span className="font-bold text-[var(--text-primary)]">{(safePage - 1) * pageSize + 1}</span> to{" "}
              <span className="font-bold text-[var(--text-primary)]">
                {Math.min(safePage * pageSize, sortedComplaints.length)}
              </span>{" "}
              of <span className="font-bold text-[var(--text-primary)]">{sortedComplaints.length}</span> records
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--primary-accent)]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
              >
                <IconChevronLeft size={13} />
                <span>Previous</span>
              </button>

              <span className="px-2.5 text-xs font-bold tabular-nums text-[var(--text-primary)] font-mono">
                Page {safePage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--primary-accent)]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
              >
                <span>Next</span>
                <IconChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function ComplaintsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#697386]">Loading complaint registry...</div>}>
      <ComplaintRegistryContent />
    </Suspense>
  );
}
