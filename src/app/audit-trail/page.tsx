"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useComplaints } from "../../lib/context/complaint-context";
import {
  IconScale,
  IconSearch,
  IconClock,
  IconUser,
  IconX,
  IconChevronRight,
} from "../../components/ui/icons";
import { Badge } from "../../components/ui/badge";
import { AnimatedNumber } from "../../components/motion/animated-number";
import { fadeInUpVariants, staggerContainerVariants } from "../../lib/motion";

function AuditTrailContent() {
  const { auditLogs } = useComplaints();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActionType, setSelectedActionType] = useState<string>("all");
  const [selectedActor, setSelectedActor] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Total count
  const totalLogs = auditLogs.length;

  // Extract unique actors from actual data
  const uniqueActors = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((log) => {
      if (log.actor) set.add(log.actor);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  // Extract generalized action categories
  const actionCategories = [
    { id: "all", label: "All Actions" },
    { id: "status", label: "Status Transitions" },
    { id: "overlap", label: "Overlap Adjudications" },
    { id: "notice", label: "Notices & Hearings" },
    { id: "resolved", label: "Resolutions" },
  ];

  // Filtered & Searched audit logs
  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return auditLogs.filter((log) => {
      // Action Category filter
      if (selectedActionType !== "all") {
        const actionLower = log.action.toLowerCase();
        if (selectedActionType === "status" && !actionLower.includes("status")) return false;
        if (selectedActionType === "overlap" && !actionLower.includes("overlap")) return false;
        if (selectedActionType === "notice" && !actionLower.includes("notice") && !actionLower.includes("hearing")) return false;
        if (selectedActionType === "resolved" && !actionLower.includes("resolved") && !actionLower.includes("closed")) return false;
      }

      // Actor filter
      if (selectedActor !== "all" && log.actor !== selectedActor) {
        return false;
      }

      // Search match
      if (q) {
        const matchesActor = log.actor.toLowerCase().includes(q);
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesDetails = log.details.toLowerCase().includes(q);
        const matchesId = log.id.toLowerCase().includes(q);
        const matchesComplaintId = log.complaintId?.toLowerCase().includes(q) || false;

        if (!matchesActor && !matchesAction && !matchesDetails && !matchesId && !matchesComplaintId) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, selectedActionType, selectedActor, searchQuery]);

  const hasActiveFilters = searchQuery !== "" || selectedActionType !== "all" || selectedActor !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedActionType("all");
    setSelectedActor("all");
  };

  const getActionBadgeVariant = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes("escalated") || a.includes("critical")) return "critical";
    if (a.includes("resolved") || a.includes("closed") || a.includes("independent")) return "success";
    if (a.includes("notice") || a.includes("hearing") || a.includes("linked")) return "warning";
    return "primary";
  };

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 1. Header & Summary Bar */}
      <motion.div variants={fadeInUpVariants} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-2 border-b border-[#E3DFD5]">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#315EFB] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
              ACCOUNTABILITY // LOG
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
              Institutional System Audit Trail
            </h1>
            <Badge variant="warning" size="sm" className="font-mono">
              Immutable Log
            </Badge>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#5A6474] max-w-2xl">
            Chronological, immutable administrative log recording every status transition, notice dispatch, and human overlap adjudication.
          </p>
        </div>

        {/* Summary Counter Pill with AnimatedNumber */}
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-[#E3DFD5] bg-white px-3.5 py-2 text-xs shadow-2xs">
            <span className="text-[#5A6474] font-medium">Recorded Events: </span>
            <span className="font-bold tabular-nums text-[#0F172A] font-mono text-sm ml-1">
              <AnimatedNumber value={totalLogs} />
            </span>
          </div>
        </div>
      </motion.div>

      {/* Advisory Banner */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#BFDBFE] bg-gradient-to-r from-blue-50/70 to-indigo-50/30 p-4 flex items-start gap-3 text-xs text-[#0F172A] shadow-2xs">
        <div className="rounded-lg bg-[#315EFB] p-1.5 text-white shrink-0 mt-0.5">
          <IconScale size={16} />
        </div>
        <p className="leading-relaxed">
          <strong className="text-blue-950 font-bold">Statutory Traceability Mandate: </strong>
          Every status transition, show-cause dispatch, and human overlap adjudication executed in the active session is immutably timestamped and attributed to an authorized officer.
        </p>
      </motion.div>

      {/* 2. Search & Filter Bar */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E3DFD5] bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Field */}
          <div className="relative flex-1 max-w-lg">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#697386]">
              <IconSearch size={14} />
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by actor, action, complaint ID, keyword..."
              className="h-9 w-full rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] pl-9 pr-8 text-xs text-[#172033] placeholder:text-[#697386] focus:border-[#315EFB] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <IconX size={13} />
              </button>
            )}
          </div>

          {/* Action Category Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#172033] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
            >
              {actionCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Actor Selector */}
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#172033] focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 shadow-2xs"
            >
              <option value="all">All Reviewers</option>
              {uniqueActors.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Counter & Reset */}
        <div className="flex items-center justify-between text-[11px] text-[#697386] pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-[#172033]">{filteredLogs.length}</strong> of{" "}
            <strong>{totalLogs}</strong> audit events
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[#C53B42] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <IconX size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* 3. Audit Event Table / Log Stream */}
      <motion.div variants={fadeInUpVariants} className="rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#697386]">
            <IconScale size={32} className="mx-auto mb-2 text-slate-400" />
            <p className="font-bold text-sm text-[#172033]">No Matching Audit Events</p>
            <p className="mt-0.5">No administrative records match your selected filter criteria.</p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#254EDB] shadow-2xs transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs" aria-label="System Audit Trail Table">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA] text-[11px] font-bold text-[#697386] uppercase tracking-wider">
                  <th scope="col" className="py-3.5 px-4 whitespace-nowrap">Timestamp</th>
                  <th scope="col" className="py-3.5 px-4">Action</th>
                  <th scope="col" className="py-3.5 px-4">Affected Case</th>
                  <th scope="col" className="py-3.5 px-4">Authorizing Officer</th>
                  <th scope="col" className="py-3.5 px-4">Administrative Directive / Details</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isOverlap = log.action.toLowerCase().includes("overlap");

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums text-[#697386]">
                          <div className="flex items-center gap-1.5">
                            <IconClock size={12} className="text-slate-400 shrink-0" />
                            <span className="font-medium text-[#172033]">{log.timestamp}</span>
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                            {log.action}
                          </Badge>
                        </td>

                        {/* Affected Dossier / Candidate */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {log.complaintId ? (
                            <Link
                              href={`/complaints/${log.complaintId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono font-bold text-[#315EFB] hover:underline"
                            >
                              {log.complaintId}
                            </Link>
                          ) : isOverlap ? (
                            <Link
                              href="/overlap-review"
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono text-xs text-[#B7791F] font-bold hover:underline"
                            >
                              Overlap Queue
                            </Link>
                          ) : (
                            <span className="text-slate-400">&mdash;</span>
                          )}
                        </td>

                        {/* Authorizing Actor */}
                        <td className="py-3.5 px-4 text-[#172033] font-semibold whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <IconUser size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{log.actor}</span>
                          </div>
                        </td>

                        {/* Action Narrative */}
                        <td className="py-3.5 px-4 text-[#172033] max-w-md">
                          <p className="line-clamp-1 leading-relaxed" title={log.details}>
                            {log.details}
                          </p>
                        </td>

                        {/* Expand Button */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedLogId(isExpanded ? null : log.id);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#315EFB] hover:underline"
                          >
                            <span>{isExpanded ? "Hide" : "Inspect"}</span>
                            <IconChevronRight
                              size={12}
                              className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Full Rationale Row with AnimatePresence */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={6} className="px-6 py-4 border-t border-slate-200">
                            <AnimatePresence>
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-2.5 text-xs"
                              >
                                <div className="flex items-center justify-between text-[11px] text-[#697386]">
                                  <span className="font-mono font-bold text-[#172033]">
                                    Event ID: {log.id}
                                  </span>
                                  <span className="font-medium text-slate-500">Verified Administrative Session Entry</span>
                                </div>
                                <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-[#172033] leading-relaxed shadow-2xs">
                                  <span className="font-bold block text-slate-800 mb-1">
                                    Full Action Narrative &amp; Institutional Directive:
                                  </span>
                                  {log.details}
                                </div>
                                {log.complaintId && (
                                  <div className="flex items-center justify-end pt-1">
                                    <Link
                                      href={`/complaints/${log.complaintId}`}
                                      className="inline-flex items-center gap-1 font-bold text-[#315EFB] hover:underline text-xs"
                                    >
                                      <span>Open Affected Complaint Dossier ({log.complaintId})</span>
                                      <IconChevronRight size={13} />
                                    </Link>
                                  </div>
                                )}
                              </motion.div>
                            </AnimatePresence>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function AuditTrailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#697386]">Loading system audit trail...</div>}>
      <AuditTrailContent />
    </Suspense>
  );
}
