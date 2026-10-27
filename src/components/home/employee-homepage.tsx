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
  IconMenu,
  IconX,
} from '../ui/icons';
import { StatusBadge, Badge } from '../ui/badge';
import { AnimatedNumber } from '../motion/animated-number';
import { OperationalDashboard } from '../dashboard/operational-dashboard';
import { ThemeCustomizer } from '../ui/theme-customizer';

export const EmployeeHomepage: React.FC = () => {
  const router = useRouter();
  const { complaints, pendingOverlapCount, backendStatus, currentOfficer } = useComplaints();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] selection:bg-[var(--primary-accent)]/30 selection:text-white transition-colors duration-200">
      {/* 1. Official AICTE Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-16 w-full items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 lg:px-8">
          {/* Left: Mobile Menu Toggle + Council Emblem & Title */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile/Tablet Menu Button (< lg) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary-accent)] transition-colors shrink-0"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <IconX size={18} /> : <IconMenu size={18} />}
            </button>

            {/* Emblem & Branding Link */}
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-accent)] text-white shadow-[0_2px_12px_var(--primary-accent-glow)] group-hover:scale-105 transition-all">
                <IconShield size={20} />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-extrabold text-xs sm:text-sm lg:text-base tracking-tight text-[var(--text-primary)] uppercase leading-none whitespace-nowrap">
                    AICTE Intelligence
                  </span>
                  <span className="rounded bg-[var(--primary-accent-subtle)] border border-[var(--primary-accent)]/30 px-1.5 py-0.5 text-[9px] font-mono font-bold text-[var(--primary-accent)] whitespace-nowrap">
                    APEX PORTAL
                  </span>
                </div>
                <span className="hidden 2xl:block text-[11px] font-medium text-[var(--text-secondary)] mt-0.5 whitespace-nowrap">
                  Institutional Document Verification &amp; Grievance System
                </span>
                <span className="hidden xl:block 2xl:hidden text-[10px] font-medium text-[var(--text-secondary)] mt-0.5 whitespace-nowrap">
                  Grievance &amp; Verification System
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation Links (>= lg: 1024px) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs font-semibold text-[var(--text-secondary)] shrink-0">
            <Link
              href="/"
              className="px-2 xl:px-2.5 py-1.5 rounded-lg text-[var(--primary-accent)] bg-[var(--primary-accent-subtle)] font-bold transition-colors whitespace-nowrap shrink-0 text-[11px] xl:text-xs"
            >
              Overview
            </Link>
            <Link
              href="/complaints"
              className="px-2 xl:px-2.5 py-1.5 rounded-lg hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors whitespace-nowrap shrink-0 text-[11px] xl:text-xs"
            >
              Review Records
            </Link>
            <Link
              href="/submit-complaint"
              className="px-2 xl:px-2.5 py-1.5 rounded-lg text-[var(--primary-accent)] hover:bg-[var(--primary-accent-subtle)] transition-colors font-bold whitespace-nowrap shrink-0 text-[11px] xl:text-xs"
            >
              Submit Complaint
            </Link>
            <Link
              href="/overlap-review"
              className="px-2 xl:px-2.5 py-1.5 rounded-lg hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 text-[11px] xl:text-xs"
            >
              <span>Overlap Triage</span>
              {pendingOverlapCount > 0 && (
                <span className="rounded-full bg-amber-500/20 text-amber-400 px-1.5 py-0.2 text-[9px] xl:text-[10px] font-bold border border-amber-500/30">
                  {pendingOverlapCount}
                </span>
              )}
            </Link>
            <Link
              href="/analytics"
              className="px-2 xl:px-2.5 py-1.5 rounded-lg hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors whitespace-nowrap shrink-0 text-[11px] xl:text-xs"
            >
              Analytics
            </Link>
            <Link
              href="/how-it-works"
              className="px-2 xl:px-2.5 py-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors font-mono text-[10px] xl:text-[11px] whitespace-nowrap shrink-0"
              title="Inspect system architecture & math formulas"
            >
              How It Works
            </Link>
          </nav>

          {/* Right: Action Controls (Theme Customizer, Officer Login, User Profile) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 xl:gap-3 shrink-0">
            {/* Theme & Palette Controls */}
            <div className="flex items-center shrink-0">
              <ThemeCustomizer />
            </div>

            {/* Officer Login Button */}
            <div className="flex items-center shrink-0">
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--primary-accent)] hover:text-[var(--primary-accent)] hover:bg-[var(--bg-surface-subtle)] transition-colors shadow-2xs whitespace-nowrap shrink-0"
              >
                Officer Login
              </Link>
            </div>

            {/* Visual Separator */}
            <div className="h-5 w-px bg-[var(--border-subtle)] shrink-0 hidden sm:block" aria-hidden="true" />

            {/* User Profile / Access Badge */}
            <div
              className="flex items-center gap-2 shrink-0 cursor-default"
              title={
                currentOfficer
                  ? `${currentOfficer.name} (${currentOfficer.badgeNumber})`
                  : 'Apex Scrutiny Reviewer (Open Prototype Access)'
              }
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)] font-bold text-xs border border-[var(--primary-accent)]/20 shadow-2xs">
                <IconUser size={16} />
              </div>
              <div className="hidden 2xl:block text-left text-xs whitespace-nowrap">
                <span className="block font-bold text-[var(--text-primary)] leading-none truncate max-w-[140px]">
                  {currentOfficer ? currentOfficer.name : 'Apex Scrutiny Reviewer'}
                </span>
                <span className="block text-[10px] text-emerald-500 font-semibold leading-none mt-1 truncate max-w-[140px]">
                  {currentOfficer ? currentOfficer.badgeNumber : 'Open Prototype Access'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Navigation Menu Dropdown (< lg: 1024px) */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-[var(--primary-accent)] bg-[var(--primary-accent-subtle)] transition-colors"
            >
              <span>Overview</span>
            </Link>
            <Link
              href="/complaints"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
            >
              <span>Review Records</span>
            </Link>
            <Link
              href="/submit-complaint"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-[var(--primary-accent)] hover:bg-[var(--primary-accent-subtle)] transition-colors"
            >
              <span>Submit Complaint</span>
            </Link>
            <Link
              href="/overlap-review"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
            >
              <span>Overlap Triage</span>
              {pendingOverlapCount > 0 && (
                <span className="rounded-full bg-amber-500/20 text-amber-400 px-2 py-0.5 text-[10px] font-bold border border-amber-500/30">
                  {pendingOverlapCount}
                </span>
              )}
            </Link>
            <Link
              href="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
            >
              <span>Analytics</span>
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
            >
              <span>How It Works</span>
            </Link>
            <div className="pt-2 sm:hidden border-t border-[var(--border-subtle)]">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--primary-accent)] hover:text-[var(--primary-accent)] transition-colors"
              >
                Officer Login
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* 2. Hero Section: Welcome & Purpose */}
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-surface-subtle)] p-6 sm:p-10 lg:p-12 shadow-[0_2px_15px_rgba(0,0,0,0.03)]">
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
              <span className="rounded-md bg-[var(--primary-accent-subtle)] border border-[var(--primary-accent)]/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--primary-accent)]">
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

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
              Centralized Institutional Grievance &amp; Document Verification
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
              Welcome to the AICTE institutional review platform. Designed specifically for council
              officers and institutional scrutinizers, this portal provides a unified workspace to
              inspect institutional records, review submitted evidentiary exhibits, and
              cross-reference grievance filings across all council bureaus without requiring
              technical knowledge.
            </p>

            {/* Live Metrics Row */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 shadow-2xs">
                <span className="block text-[11px] font-mono uppercase text-[var(--text-muted)]">
                  Institutional Intake
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black tabular-nums text-[var(--text-primary)] font-mono">
                    <AnimatedNumber value={totalCount} />
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">cases</span>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--primary-accent)]/30 bg-[var(--primary-accent-subtle)] p-3.5 shadow-2xs">
                <span className="block text-[11px] font-mono uppercase text-[var(--primary-accent)] font-bold">
                  Active in Scrutiny
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black tabular-nums text-[var(--text-primary)] font-mono">
                    <AnimatedNumber value={activeCount} />
                  </span>
                  <span className="text-[11px] text-[var(--primary-accent)]">underway</span>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 shadow-2xs col-span-2 sm:col-span-1">
                <span className="block text-[11px] font-mono uppercase text-emerald-400 font-bold">
                  Resolved / Concluded
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black tabular-nums text-emerald-400 font-mono">
                    <AnimatedNumber value={resolvedCount} />
                  </span>
                  <span className="text-[11px] text-emerald-400/80">completed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. The Two Primary Action Choices (Core Deliverable) */}
        <section className="space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--primary-accent)]">
              Choose Workflow
            </span>
            <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
              What would you like to do?
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Select a primary pathway below to inspect existing records or submit a new
              institutional grievance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* OPTION 1: Review Existing Records */}
            <div className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-7 sm:p-8 shadow-sm hover:border-[var(--primary-accent)]/60 hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)] group-hover:scale-105 transition-transform shadow-2xs">
                    <IconFileText size={24} />
                  </div>
                  <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                    OPTION 1
                  </Badge>
                </div>

                <div>
                  <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--primary-accent)] transition-colors">
                    Review Existing Records
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    Access previously processed institutional documents, examine verification
                    findings, search records across all 5 AICTE bureaus, and inspect attached
                    evidence exhibits.
                  </p>
                </div>

                {/* Key features checklist */}
                <ul className="space-y-2 text-xs text-[var(--text-primary)] pt-1">
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      ✓
                    </span>
                    <span>Search records by AICTE Permanent ID, Institution, or Case number</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      ✓
                    </span>
                    <span>Inspect formal allegations, fee receipts, affidavits, and notices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
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
                      className="w-full h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-accent)] focus:bg-[var(--bg-surface)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 transition-all font-medium"
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-muted)]">
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
                  className="w-full h-11 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--primary-accent)] hover:text-[var(--primary-accent)] font-bold text-xs transition-all shadow-2xs inline-flex items-center justify-center gap-2 group-hover:border-[var(--primary-accent)]"
                >
                  <span>Review Existing Records</span>
                  <IconArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* OPTION 2: Submit a Complaint */}
            <div className="group rounded-2xl border-2 border-[var(--primary-accent)]/30 bg-gradient-to-b from-[var(--bg-surface)] to-[var(--primary-accent-subtle)]/20 p-7 sm:p-8 shadow-sm hover:border-[var(--primary-accent)] hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-accent)] text-white group-hover:scale-105 transition-transform shadow-[0_2px_12px_var(--primary-accent-glow)]">
                    <IconUpload size={24} />
                  </div>
                  <Badge variant="primary" size="sm" className="font-mono text-[10px]">
                    OPTION 2
                  </Badge>
                </div>

                <div>
                  <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--primary-accent)] transition-colors">
                    Submit a Complaint
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    Submit a new grievance or regulatory inquiry concerning an affiliated
                    institution, itemize formal allegations, attach supporting exhibits, and
                    generate a structured scrutiny report.
                  </p>
                </div>

                {/* Key features checklist */}
                <ul className="space-y-2 text-xs text-[var(--text-primary)] pt-1">
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)]">
                      ✓
                    </span>
                    <span>Link directly to verified AICTE Permanent Institute ID directory</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)]">
                      ✓
                    </span>
                    <span>Attach document exhibits (fee challans, affidavits, communications)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)]">
                      ✓
                    </span>
                    <span>
                      Instant report: matches across sources, differences &amp; next steps
                    </span>
                  </li>
                </ul>

                {/* Highlight box */}
                <div className="rounded-xl border border-[var(--primary-accent)]/30 bg-[var(--bg-surface)]/80 p-3 text-xs text-[var(--text-secondary)]">
                  <strong className="text-[var(--primary-accent)] block mb-0.5">
                    Automated Cross-Bureau Analysis
                  </strong>
                  The system scans all previous filings and highlights potential duplicate or
                  coordinated cases for officer adjudication.
                </div>
              </div>

              <div>
                <Link
                  href="/submit-complaint"
                  className="w-full h-11 rounded-xl bg-[var(--primary-accent)] text-white hover:bg-[var(--primary-accent-hover)] font-bold text-xs transition-all shadow-md inline-flex items-center justify-center gap-2 shadow-[0_0_15px_var(--primary-accent-glow)]"
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
          <div className="border-b border-[var(--border-subtle)] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--primary-accent)]">
                Central Intelligence
              </span>
              <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                Operational Caseload &amp; Triage Dashboard
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/overlap-review"
                className="text-xs font-bold text-[var(--primary-accent)] hover:text-[var(--primary-accent-hover)] transition-colors inline-flex items-center gap-1"
              >
                <span>Overlap Review Queue ({pendingOverlapCount})</span>
                <IconArrowRight size={13} />
              </Link>
            </div>
          </div>
          <OperationalDashboard />
        </section>

        {/* 4. Four-Step Review Process Explanation (Simple Language) */}
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--primary-accent)]">
              Standard Operating Procedure
            </span>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              How the Verification Process Works for Reviewers
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              A non-technical overview of the four procedural stages each complaint undergoes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-4 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)] font-bold text-xs font-mono">
                01
              </span>
              <h3 className="font-bold text-xs text-[var(--text-primary)]">Record Registration</h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                The reviewer enters institution details, categorizes the grievance, and catalogs
                supporting evidentiary attachments.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-4 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)] font-bold text-xs font-mono">
                02
              </span>
              <h3 className="font-bold text-xs text-[var(--text-primary)]">Source Comparison</h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                The engine evaluates canonical Permanent IDs, dates, and grievance subjects against
                active files in all council bureaus.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-4 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)] font-bold text-xs font-mono">
                03
              </span>
              <h3 className="font-bold text-xs text-[var(--text-primary)]">Officer Scrutiny</h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Designated Scrutiny Officers inspect flagged matches, examine discrepancies, and
                inspect exhibits side-by-side.
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-4 space-y-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)] font-bold text-xs font-mono">
                04
              </span>
              <h3 className="font-bold text-xs text-[var(--text-primary)]">Fair Determination</h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                The bureau dispatches official notices, coordinates joint inquiries, or resolves the
                grievance with complete audit logging.
              </p>
            </div>
          </div>

          {/* Statutory Council Disclaimer (Requirement 7) */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-start gap-3">
            <IconAlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-400">Council Regulatory Assurance &amp; Advisory Principle</p>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
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
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--primary-accent)]">
                Central Repository
              </span>
              <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Recent Institutional Cases
              </h2>
            </div>
            <Link
              href="/complaints"
              className="text-xs font-bold text-[var(--primary-accent)] hover:text-[var(--primary-accent-hover)] transition-colors inline-flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View All {totalCount} Records in Registry</span>
              <IconChevronRight size={13} />
            </Link>
          </div>

          <div className="divide-y divide-[var(--border-subtle)] overflow-x-auto">
            {recentRecords.map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)]">
                    <IconFileText size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[var(--text-primary)]">{item.id}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">&bull;</span>
                      <span className="font-semibold text-[var(--text-primary)] truncate max-w-xs sm:max-w-md">
                        {item.institutionName}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-sm sm:max-w-lg mt-0.5">
                      {item.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden sm:inline-block text-[11px] text-[var(--text-muted)]">
                    {item.bureau}
                  </span>
                  <StatusBadge status={item.status} />
                  <Link
                    href={`/complaints/${item.id}`}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary-accent)] transition-colors"
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
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] py-8 text-xs text-[var(--text-muted)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <IconShield size={16} className="text-[var(--primary-accent)]" />
            <span className="font-bold text-[var(--text-primary)]">
              All India Council for Technical Education (AICTE)
            </span>
            <span>&bull; Nelson Mandela Marg, Vasant Kunj, New Delhi</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/how-it-works" className="hover:text-[var(--text-primary)] transition-colors">
              System Architecture
            </Link>
            <Link href="/audit-trail" className="hover:text-[var(--text-primary)] transition-colors">
              Audit Trail
            </Link>
            <Link href="/analytics" className="hover:text-[var(--text-primary)] transition-colors">
              Analytics
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
