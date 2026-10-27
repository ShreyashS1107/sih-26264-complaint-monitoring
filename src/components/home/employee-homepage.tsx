'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useComplaints } from '../../lib/context/complaint-context';
import {
  IconShield,
  IconFileText,
  IconUpload,
  IconSearch,
  IconArrowRight,
  IconAlertTriangle,
  IconChevronRight,
  IconUser,
} from '../ui/icons';
import { StatusBadge, Badge } from '../ui/badge';
import { AnimatedNumber } from '../motion/animated-number';
import { OperationalDashboard } from '../dashboard/operational-dashboard';
import { ThemeCustomizer } from '../ui/theme-customizer';

export const EmployeeHomepage: React.FC = () => {
  const router = useRouter();
  const { complaints, pendingOverlapCount, backendStatus, currentOfficer } = useComplaints();

  const [searchQuery, setSearchQuery] = useState('');

  // Handle direct lookup search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/complaints?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/complaints');
    }
  };

  // Compute live metric counts from genuine state
  const totalCount = complaints.length;
  const activeCount = useMemo(
    () => complaints.filter((c) => c.status !== 'Resolved').length,
    [complaints]
  );
  const resolvedCount = useMemo(
    () => complaints.filter((c) => c.status === 'Resolved').length,
    [complaints]
  );

  // Recent 4 complaints for review preview
  const recentRecords = useMemo(() => complaints.slice(0, 4), [complaints]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#172033] selection:bg-[#315EFB]/20 selection:text-[#0B0F19]">
      {/* 1. Official AICTE Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[#E5E0D5] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Council Emblem & Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#315EFB] text-white shadow-[0_2px_10px_rgba(49,94,251,0.3)] group-hover:scale-105 transition-transform">
              <IconShield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#172033] uppercase leading-none">
                  AICTE Intelligence
                </span>
                <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[9px] font-mono font-bold text-[#315EFB]">
                  APEX PORTAL
                </span>
              </div>
              <span className="block text-[11px] font-medium text-[#697386] mt-0.5">
                Institutional Document Verification &amp; Grievance System
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-[#5A6474]">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg text-[#315EFB] bg-blue-50/60 font-bold transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/complaints"
              className="px-3 py-1.5 rounded-lg hover:text-[#172033] hover:bg-slate-100 transition-colors"
            >
              Review Records
            </Link>
            <Link
              href="/submit-complaint"
              className="px-3 py-1.5 rounded-lg text-[#315EFB] hover:bg-blue-50 transition-colors font-bold"
            >
              Submit Complaint
            </Link>
            <Link
              href="/overlap-review"
              className="px-3 py-1.5 rounded-lg hover:text-[#172033] hover:bg-slate-100 transition-colors flex items-center gap-1.5"
            >
              <span>Overlap Triage</span>
              {pendingOverlapCount > 0 && (
                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.2 text-[10px] font-bold border border-amber-200">
                  {pendingOverlapCount}
                </span>
              )}
            </Link>
            <Link
              href="/analytics"
              className="px-3 py-1.5 rounded-lg hover:text-[#172033] hover:bg-slate-100 transition-colors"
            >
              Analytics
            </Link>
            <Link
              href="/how-it-works"
              className="px-3 py-1.5 rounded-lg text-[#697386] hover:text-[#172033] hover:bg-slate-100 transition-colors font-mono text-[11px]"
              title="Inspect system architecture & math formulas"
            >
              How It Works
            </Link>
          </nav>

          {/* Prototype Access / Scrutiny Status */}
          <div className="flex items-center gap-3">
            <ThemeCustomizer />
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--primary-accent)] hover:text-[var(--primary-accent)] transition-colors shadow-2xs"
            >
              Demo Login
            </Link>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-accent)]/10 text-[var(--primary-accent)] font-bold text-xs">
                <IconUser size={16} />
              </div>
              <div className="hidden sm:block text-left text-xs">
                <span className="block font-bold text-[#172033] leading-none">
                  {currentOfficer ? currentOfficer.name : 'Apex Scrutiny Reviewer'}
                </span>
                <span className="block text-[10px] text-emerald-600 font-semibold leading-none mt-1">
                  {currentOfficer ? currentOfficer.badgeNumber : 'Open Prototype Access'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* 2. Hero Section: Welcome & Purpose */}
        <section className="relative overflow-hidden rounded-3xl border border-[#E5E0D5] bg-gradient-to-b from-white to-[#F7F5F0] p-6 sm:p-10 lg:p-12 shadow-[0_2px_15px_rgba(0,0,0,0.03)]">
          {/* Subtle Grid Pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(to right, #000 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#315EFB]">
                All India Council for Technical Education
              </span>
              {backendStatus === 'connected' ? (
                <Badge variant="success" size="sm" className="font-medium gap-1 text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Central Registry Active</span>
                </Badge>
              ) : (
                <Badge
                  variant="warning"
                  size="sm"
                  className="font-medium gap-1 text-[11px]"
                  title="Database disconnected; operating via deterministic in-memory fixtures"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Demonstration Mode (Local Fixtures)</span>
                </Badge>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#172033] leading-tight">
              Centralized Institutional Grievance &amp; Document Verification
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-[#5A6474]">
              Welcome to the AICTE institutional review platform. Designed specifically for council
              officers and institutional scrutinizers, this portal provides a unified workspace to
              inspect institutional records, review submitted evidentiary exhibits, and
              cross-reference grievance filings across all council bureaus without requiring
              technical knowledge.
            </p>

            {/* Live Metrics Row */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
              <div className="rounded-xl border border-[#E5E0D5] bg-white p-3.5 shadow-2xs">
                <span className="block text-[11px] font-mono uppercase text-[#697386]">
                  Institutional Intake
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black tabular-nums text-[#172033] font-mono">
                    <AnimatedNumber value={totalCount} />
                  </span>
                  <span className="text-[11px] text-[#697386]">cases</span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-2xs">
                <span className="block text-[11px] font-mono uppercase text-[#315EFB] font-bold">
                  Active in Scrutiny
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black tabular-nums text-blue-950 font-mono">
                    <AnimatedNumber value={activeCount} />
                  </span>
                  <span className="text-[11px] text-blue-800">underway</span>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-2xs col-span-2 sm:col-span-1">
                <span className="block text-[11px] font-mono uppercase text-emerald-800 font-bold">
                  Resolved / Concluded
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black tabular-nums text-emerald-950 font-mono">
                    <AnimatedNumber value={resolvedCount} />
                  </span>
                  <span className="text-[11px] text-emerald-800">completed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. The Two Primary Action Choices (Core Deliverable) */}
        <section className="space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#315EFB]">
              Choose Workflow
            </span>
            <h2 className="text-2xl font-black tracking-tight text-[#172033]">
              What would you like to do?
            </h2>
            <p className="text-xs text-[#5A6474]">
              Select a primary pathway below to inspect existing records or submit a new
              institutional grievance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* OPTION 1: Review Existing Records */}
            <div className="group rounded-2xl border border-[#E2DDD3] bg-white p-7 sm:p-8 shadow-sm hover:border-[#315EFB]/60 hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#315EFB] group-hover:scale-105 transition-transform shadow-2xs">
                    <IconFileText size={24} />
                  </div>
                  <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                    OPTION 1
                  </Badge>
                </div>

                <div>
                  <h3 className="text-xl font-bold tracking-tight text-[#172033] group-hover:text-[#315EFB] transition-colors">
                    Review Existing Records
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#5A6474] leading-relaxed">
                    Access previously processed institutional documents, examine verification
                    findings, search records across all 5 AICTE bureaus, and inspect attached
                    evidence exhibits.
                  </p>
                </div>

                {/* Key features checklist */}
                <ul className="space-y-2 text-xs text-[#172033] pt-1">
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      ✓
                    </span>
                    <span>Search records by AICTE Permanent ID, Institution, or Case number</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      ✓
                    </span>
                    <span>Inspect formal allegations, fee receipts, affidavits, and notices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      ✓
                    </span>
                    <span>View cross-bureau overlap recommendations &amp; procedural status</span>
                  </li>
                </ul>

                {/* Instant Search Bar Inside Card */}
                <form onSubmit={handleSearchSubmit} className="pt-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter Institution Name or Permanent ID..."
                      className="w-full h-10 rounded-lg border border-[#D6CFC4] bg-[#FAF8F4] pl-9 pr-3 text-xs text-[#172033] placeholder:text-slate-400 focus:border-[#315EFB] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 transition-all font-medium"
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <IconSearch size={14} />
                    </div>
                  </div>
                </form>
              </div>

              <div>
                <Link
                  href={
                    searchQuery.trim()
                      ? `/complaints?q=${encodeURIComponent(searchQuery.trim())}`
                      : '/complaints'
                  }
                  className="w-full h-11 rounded-xl bg-[#0F172A] text-white hover:bg-[#1E293B] font-bold text-xs transition-all shadow-2xs inline-flex items-center justify-center gap-2 group-hover:bg-[#315EFB]"
                >
                  <span>Review Existing Records</span>
                  <IconArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* OPTION 2: Submit a Complaint */}
            <div className="group rounded-2xl border-2 border-[#315EFB]/30 bg-gradient-to-b from-white to-blue-50/20 p-7 sm:p-8 shadow-sm hover:border-[#315EFB] hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#315EFB] text-white group-hover:scale-105 transition-transform shadow-[0_2px_12px_rgba(49,94,251,0.3)]">
                    <IconUpload size={24} />
                  </div>
                  <Badge variant="primary" size="sm" className="font-mono text-[10px]">
                    OPTION 2
                  </Badge>
                </div>

                <div>
                  <h3 className="text-xl font-bold tracking-tight text-[#172033] group-hover:text-[#315EFB] transition-colors">
                    Submit a Complaint
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#5A6474] leading-relaxed">
                    Submit a new grievance or regulatory inquiry concerning an affiliated
                    institution, itemize formal allegations, attach supporting exhibits, and
                    generate a structured scrutiny report.
                  </p>
                </div>

                {/* Key features checklist */}
                <ul className="space-y-2 text-xs text-[#172033] pt-1">
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[#315EFB]">
                      ✓
                    </span>
                    <span>Link directly to verified AICTE Permanent Institute ID directory</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[#315EFB]">
                      ✓
                    </span>
                    <span>Attach document exhibits (fee challans, affidavits, communications)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-[#315EFB]">
                      ✓
                    </span>
                    <span>
                      Instant report: matches across sources, differences &amp; next steps
                    </span>
                  </li>
                </ul>

                {/* Highlight box */}
                <div className="rounded-xl border border-blue-200 bg-white/80 p-3 text-xs text-[#5A6474]">
                  <strong className="text-[#315EFB] block mb-0.5">
                    Automated Cross-Bureau Analysis
                  </strong>
                  The system scans all previous filings and highlights potential duplicate or
                  coordinated cases for officer adjudication.
                </div>
              </div>

              <div>
                <Link
                  href="/submit-complaint"
                  className="w-full h-11 rounded-xl bg-[#315EFB] text-white hover:bg-[#254EDB] font-bold text-xs transition-all shadow-md inline-flex items-center justify-center gap-2"
                >
                  <span>Submit a Complaint</span>
                  <IconArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Live Operational Command Center & Triage Dashboard */}
        <section className="space-y-4">
          <div className="border-b border-[#E5E0D5] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#315EFB]">
                Central Intelligence
              </span>
              <h2 className="text-2xl font-black tracking-tight text-[#172033]">
                Operational Caseload &amp; Triage Dashboard
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/overlap-review"
                className="text-xs font-bold text-[#315EFB] hover:text-[#254EDB] transition-colors inline-flex items-center gap-1"
              >
                <span>Overlap Review Queue ({pendingOverlapCount})</span>
                <IconArrowRight size={13} />
              </Link>
            </div>
          </div>
          <OperationalDashboard />
        </section>

        {/* 4. Four-Step Review Process Explanation (Simple Language) */}
        <section className="rounded-2xl border border-[#E5E0D5] bg-white p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#315EFB]">
              Standard Operating Procedure
            </span>
            <h2 className="text-xl font-bold tracking-tight text-[#172033]">
              How the Verification Process Works for Reviewers
            </h2>
            <p className="text-xs text-[#5A6474]">
              A non-technical overview of the four procedural stages each complaint undergoes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="rounded-xl border border-slate-200 bg-[#FAF8F4] p-4 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#315EFB] font-bold text-xs font-mono">
                01
              </span>
              <h3 className="font-bold text-xs text-[#172033]">Record Registration</h3>
              <p className="text-[11px] text-[#5A6474] leading-relaxed">
                The reviewer enters institution details, categorizes the grievance, and catalogs
                supporting evidentiary attachments.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-slate-200 bg-[#FAF8F4] p-4 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#315EFB] font-bold text-xs font-mono">
                02
              </span>
              <h3 className="font-bold text-xs text-[#172033]">Source Comparison</h3>
              <p className="text-[11px] text-[#5A6474] leading-relaxed">
                The engine evaluates canonical Permanent IDs, dates, and grievance subjects against
                active files in all council bureaus.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-slate-200 bg-[#FAF8F4] p-4 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#315EFB] font-bold text-xs font-mono">
                03
              </span>
              <h3 className="font-bold text-xs text-[#172033]">Officer Scrutiny</h3>
              <p className="text-[11px] text-[#5A6474] leading-relaxed">
                Designated Scrutiny Officers inspect flagged matches, examine discrepancies, and
                inspect exhibits side-by-side.
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-xl border border-slate-200 bg-[#FAF8F4] p-4 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[#315EFB] font-bold text-xs font-mono">
                04
              </span>
              <h3 className="font-bold text-xs text-[#172033]">Fair Determination</h3>
              <p className="text-[11px] text-[#5A6474] leading-relaxed">
                The bureau dispatches official notices, coordinates joint inquiries, or resolves the
                grievance with complete audit logging.
              </p>
            </div>
          </div>

          {/* Statutory Council Disclaimer (Requirement 7) */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-950 flex items-start gap-3">
            <IconAlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Council Regulatory Assurance &amp; Advisory Principle</p>
              <p className="text-[11px] leading-relaxed text-amber-900">
                Automated similarity scores and detected discrepancies are generated strictly to
                assist human officers in coordinating inquiries. A detected overlap or discrepancy{' '}
                <strong>
                  does not constitute automatic proof of fraud, malpractice, or document
                  irregularity
                </strong>
                . All regulatory conclusions require independent factual investigation by the
                designated Scrutiny Officer.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Recently Active Institutional Records Preview */}
        <section className="rounded-2xl border border-[#E5E0D5] bg-white p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#315EFB]">
                Central Repository
              </span>
              <h2 className="text-xl font-bold tracking-tight text-[#172033]">
                Recent Institutional Cases
              </h2>
            </div>
            <Link
              href="/complaints"
              className="text-xs font-bold text-[#315EFB] hover:text-[#254EDB] transition-colors inline-flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View All {totalCount} Records in Registry</span>
              <IconChevronRight size={13} />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {recentRecords.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#315EFB]">
                    <IconFileText size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#172033]">{item.id}</span>
                      <span className="text-[10px] text-[#697386]">&bull;</span>
                      <span className="font-semibold text-[#172033] truncate max-w-xs sm:max-w-md">
                        {item.institutionName}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5A6474] truncate max-w-sm sm:max-w-lg mt-0.5">
                      {item.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:inline-block text-[11px] text-[#697386]">
                    {item.bureau}
                  </span>
                  <StatusBadge status={item.status} />
                  <Link
                    href={`/complaints/${item.id}`}
                    className="p-1.5 text-slate-400 hover:text-[#315EFB] transition-colors"
                    title="Review Dossier"
                  >
                    <IconChevronRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="border-t border-[#E5E0D5] bg-[#FAF8F4] py-8 text-xs text-[#697386]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <IconShield size={16} className="text-[#315EFB]" />
            <span className="font-bold text-[#172033]">
              All India Council for Technical Education (AICTE)
            </span>
            <span>&bull; Nelson Mandela Marg, Vasant Kunj, New Delhi</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/how-it-works" className="hover:text-[#172033] transition-colors">
              System Architecture
            </Link>
            <Link href="/audit-trail" className="hover:text-[#172033] transition-colors">
              Audit Trail
            </Link>
            <Link href="/analytics" className="hover:text-[#172033] transition-colors">
              Analytics
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
