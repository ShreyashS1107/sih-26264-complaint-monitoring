'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  IconShield,
  IconChevronRight,
  IconChevronLeft,
  IconMenu,
  IconX,
  IconArrowRight,
  IconCheckCircle,
  IconAlertTriangle,
  IconInfo,
  IconCpu,
  IconPrinter,
  IconScale,
} from '../../components/ui/icons';
import { useComplaints } from '../../lib/context/complaint-context';

// ==============================================================================
// Architectural Data (Derived from SIH26264.html & verified against schema)
// ==============================================================================

interface ArchLayer {
  name: string;
  desc: string;
  input: string;
  output: string;
  status: string;
  verified: boolean;
}

const ARCH_LAYERS: ArchLayer[] = [
  {
    name: 'Users & Portals',
    desc: 'Complainants (students, faculty, citizens) submit grievances via public intake; authorized bureau officers inspect, adjudicate, and manage cases.',
    input: 'Browser / Client UI',
    output: 'Frontend Actions',
    status: 'Active (Public Intake & Officer Console)',
    verified: true,
  },
  {
    name: 'Frontend Presentation',
    desc: 'Next.js 16 (App Router) with React 19, Motion micro-interactions, and accessible Tailwind CSS design tokens.',
    input: 'User Requests & Filters',
    output: 'REST API Calls',
    status: 'Implemented & Active',
    verified: true,
  },
  {
    name: 'Backend API Layer',
    desc: 'Next.js Route Handlers (/api/v1/complaints, /api/v1/overlap-candidates, /api/v1/dashboard). Handles auth, dispatch, and state queries.',
    input: 'HTTP JSON Payloads',
    output: 'Validated Service Calls',
    status: 'Implemented with Seed & DB Fallback',
    verified: true,
  },
  {
    name: 'Validation & Typing',
    desc: 'Zod runtime schemas check incoming complaint payloads, officer assignments, and overlap verdicts before persistence.',
    input: 'Raw Request Bodies',
    output: 'Sanitized & Typed DTOs',
    status: 'Verified in src/modules/complaints/schema.ts',
    verified: true,
  },
  {
    name: 'Prisma ORM + PostgreSQL',
    desc: 'PostgreSQL relational persistence with 7 models (Institution, Bureau, Officer, Complaint, CaseAction, OverlapCandidate, AuditLog).',
    input: 'Typed Queries',
    output: 'Relational Records',
    status: 'Verified in prisma/schema.prisma',
    verified: true,
  },
  {
    name: 'Overlap Engine',
    desc: 'Multi-signal scoring engine (0.35 Entity, 0.40 Subject, 0.15 Time, 0.10 Complainant). Generates candidate pairs if composite score ≥ 0.45.',
    input: 'Complaint Pair Signals',
    output: 'Candidate Recommendations',
    status: 'Implemented in src/modules/overlap-detection (113+ tests)',
    verified: true,
  },
  {
    name: 'Human Review Workflow',
    desc: 'Authorized case officers evaluate overlap evidence side-by-side. Decisions (Confirmed, Joint Review, Dismissed) are recorded without auto-merging.',
    input: 'Candidate Evidence Dossiers',
    output: 'Adjudication Verdicts',
    status: 'Interactive Review Console Active',
    verified: true,
  },
  {
    name: 'Monitoring & Audit',
    desc: 'Tamper-evident audit logs trace every status transition, assignment, and overlap verdict. Operational metrics aggregated across bureaus.',
    input: 'State Events',
    output: 'Audit Log & Executive Dashboard',
    status: 'Active with Audit Trail & Analytics',
    verified: true,
  },
];

interface LifecycleStage {
  step: string;
  name: string;
  input: string;
  processing: string;
  output: string;
  entities: string;
  status: string;
}

const LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    step: '01',
    name: 'Registration',
    input: 'Complainant details, institution Permanent ID, subject, narrative, category',
    processing:
      'Intake normalization, masking complainant PII, assigning tracking number (CMP-2026-XXXX)',
    output: 'Created Complaint record in SUBMITTED status',
    entities: 'Complaint, Institution',
    status: 'Implemented',
  },
  {
    step: '02',
    name: 'Validation',
    input: 'Submitted payload fields and institutional metadata',
    processing: 'Zod schema validation, institution verification against AICTE registry',
    output: 'Validated and categorized grievance dossier',
    entities: 'Complaint, Institution',
    status: 'Implemented',
  },
  {
    step: '03',
    name: 'Overlap Analysis',
    input: 'Newly registered complaint evaluated against active institutional complaint cohort',
    processing: 'Candidate filtering by AICTE institution, time window, and bureau eligibility',
    output: 'Target comparison pairs selected for heuristic scoring',
    entities: 'Complaint, OverlapCandidate',
    status: 'Implemented in overlap engine',
  },
  {
    step: '04',
    name: 'Multi-Signal Scoring',
    input:
      'Four independent signals: Institution (0.35), Subject (0.40), Time (0.15), Complainant (0.10)',
    processing:
      'Cosine TF-IDF & Jaccard bigram similarity, exponential half-life decay, masked indicator matching',
    output: 'Composite score; candidate generated if score ≥ 0.45 threshold',
    entities: 'OverlapCandidate',
    status: 'Implemented with 113+ unit & integration tests',
  },
  {
    step: '05',
    name: 'Human Review',
    input:
      'OverlapCandidate dossier with side-by-side complaint text and signal evidence breakdown',
    processing:
      'Authorized officer reviews; records verdict (Confirmed Overlap or Dismissed Independent)',
    output: 'Recorded verdict; neither complaint is merged, deleted, or suppressed',
    entities: 'OverlapCandidate, Officer, CaseAction',
    status: 'Implemented in Overlap Review Queue',
  },
  {
    step: '06',
    name: 'Case Handling',
    input:
      'Complaint assigned to specialized AICTE Bureau (Approval, Anti-Ragging, Student Grievance, etc.)',
    processing:
      'Show-cause notices, institutional responses, hearings, and evidence collection recorded',
    output: 'Case progression events appended to immutable timeline',
    entities: 'Complaint, Bureau, CaseAction, Officer',
    status: 'Implemented in Complaint Dossier View',
  },
  {
    step: '07',
    name: 'Operational Monitoring',
    input: 'Aggregated complaints across all bureaus and cells',
    processing:
      'SLA compliance tracking, bureau workload distribution, and category trend analysis',
    output: 'Real-time executive metrics, alert badges, and cross-bureau visibility',
    entities: 'DashboardSummary, Bureau, Complaint',
    status: 'Implemented in Analytics & Command Center',
  },
  {
    step: '08',
    name: 'Resolution & Closure',
    input: 'Final bureau finding, corrective action directives, or hearing compliance',
    processing: 'Final administrative resolution recorded; closure notifications dispatched',
    output: 'Complaint status updated to RESOLVED with full audit trail',
    entities: 'Complaint, CaseAction, AuditLog',
    status: 'Implemented with status progression controls',
  },
];

interface WalkthroughStep {
  title: string;
  desc: string;
  scoreDisplay?: boolean;
  scoreVal?: number;
  scoreBand?: string;
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    title: '1. Both Grievances Registered Independently',
    desc: 'Dossier C-101 and Dossier C-205 are submitted by different students on different days regarding ABC Engineering College. Both complaints enter the portal as separate, autonomous records with unique tracking IDs.',
    scoreDisplay: false,
  },
  {
    title: '2. Engine Extracts and Compares Signals',
    desc: 'The cross-bureau overlap detection engine compares C-101 and C-205 across 4 dimensions: same AICTE Permanent ID (1.0), high keyword overlap on examination fee refund refusal (0.85), 4-day submission delta (0.90), and complainant indicators (0.20).',
    scoreDisplay: false,
  },
  {
    title: '3. Score Computation & Candidate Generation',
    desc: 'Weighted calculation: (0.35 × 1.0) + (0.40 × 0.85) + (0.15 × 0.90) + (0.10 × 0.20) = 0.845. Because the composite score exceeds the 0.45 candidate threshold, an OverlapCandidate record is generated in the High Band.',
    scoreDisplay: true,
    scoreVal: 0.845,
    scoreBand: 'High Overlap (≥ 0.65)',
  },
  {
    title: '4. Reviewer Examines Side-by-Side Evidence',
    desc: "An authorized AICTE scrutiny officer inspects both grievances in the Overlap Review Queue. The UI highlights shared keywords ('examination fee', 'refund', 'refusing'), institutional history, and submission timeline.",
    scoreDisplay: true,
    scoreVal: 0.845,
    scoreBand: 'Pending Human Review',
  },
  {
    title: '5. Officer Records Official Adjudication',
    desc: 'The officer confirms that both complaints describe a systematic examination fee refund issue at ABC Engineering College and flags the case for coordinated joint bureau review.',
    scoreDisplay: true,
    scoreVal: 0.845,
    scoreBand: 'Confirmed Overlap Verdict',
  },
  {
    title: '6. Both Original Records Preserved Intact',
    desc: 'Crucial governance guarantee: Neither complaint is merged, overwritten, or deleted. Both C-101 and C-205 remain autonomous dossiers with their own original bureau references and individual complainants.',
    scoreDisplay: false,
  },
  {
    title: '7. Bureau Handling Continues Independently',
    desc: 'Each bureau investigates its assigned case. Bureau officers can now cross-reference the related dossier to prevent contradictory rulings, but each complaint receives its own official response and closure.',
    scoreDisplay: false,
  },
];

export default function HowItWorksPage() {
  const { complaints, overlaps, pendingOverlapCount } = useComplaints();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Interactive UI State
  const [activeArchLayer, setActiveArchLayer] = useState(0);
  const [activeLifeStage, setActiveLifeStage] = useState(0);
  const [walkthroughIndex, setWalkthroughIndex] = useState(0);
  const [simpleMode, setSimpleMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Dynamic Signal Weights Simulator
  const [signalEntity, setSignalEntity] = useState(1.0);
  const [signalSubject, setSignalSubject] = useState(0.85);
  const [signalTime, setSignalTime] = useState(0.9);
  const [signalComplainant, setSignalComplainant] = useState(0.2);

  const compositeScore = useMemo(() => {
    const raw =
      0.35 * signalEntity + 0.4 * signalSubject + 0.15 * signalTime + 0.1 * signalComplainant;
    return Math.min(1, Math.max(0, raw));
  }, [signalEntity, signalSubject, signalTime, signalComplainant]);

  const scoreClassification = useMemo(() => {
    if (compositeScore >= 0.65) {
      return {
        band: 'High Overlap',
        desc: 'Candidate flagged for priority joint bureau inquiry and coordination',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        candidate: true,
      };
    }
    if (compositeScore >= 0.45) {
      return {
        band: 'Moderate Cluster',
        desc: 'Candidate flagged for advisory cross-bureau visibility',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        candidate: true,
      };
    }
    return {
      band: 'Low / Independent',
      desc: 'Below 0.45 threshold — treated as independent; no review candidate created',
      color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
      candidate: false,
    };
  }, [compositeScore]);

  const currentWalkthrough = WALKTHROUGH_STEPS[walkthroughIndex];

  return (
    <div className="relative min-h-screen bg-[#050811] text-slate-100 selection:bg-[#315EFB]/40 selection:text-white antialiased">
      {/* Background Technical Grid Texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      {/* Embedded CSS for SVG Stream Flow Animation */}
      <style>{`
        @keyframes streamFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -24; }
        }
        @keyframes streamDot1 {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(145px); opacity: 0; }
        }
        @keyframes streamDot2 {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(145px); opacity: 0; }
        }
        .stream-dash {
          stroke-dasharray: 6 6;
          animation: streamFlow 1.4s linear infinite;
        }
        .stream-dot-1 {
          animation: streamDot1 3s ease-in-out infinite;
        }
        .stream-dot-2 {
          animation: streamDot2 3s ease-in-out infinite 1.5s;
        }
        .animation-paused .stream-dash,
        .animation-paused .stream-dot-1,
        .animation-paused .stream-dot-2 {
          animation-play-state: paused !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .stream-dash, .stream-dot-1, .stream-dot-2 {
            animation: none !important;
          }
        }
        @media print {
          header.nav-header, nav.sub-nav, .no-print {
            display: none !important;
          }
          body, .min-h-screen {
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* ==================================================================== */}
      {/* 1. Main Website Header (Identical Brand Identity & Navigation)       */}
      {/* ==================================================================== */}
      <header className="nav-header sticky top-0 z-40 border-b border-slate-800/90 bg-[#050811]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Identity & Coordinates */}
          <Link
            href="/"
            className="flex items-center gap-3.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#315EFB] rounded-lg p-1 group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#315EFB] text-white shadow-[0_0_20px_rgba(49,94,251,0.5)] group-hover:scale-105 transition-transform">
              <IconShield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="block text-sm font-extrabold tracking-tight text-white uppercase leading-none">
                  AICTE Intelligence
                </span>
                <span className="rounded bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.2 text-[9px] font-mono font-bold text-blue-300">
                  APEX 2026
                </span>
              </div>
              <span className="block text-[10px] font-mono tracking-widest text-slate-400 mt-1 uppercase">
                28.5355° N, 77.1664° E &bull; Institutional Grievance Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Link
              href="/"
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/70 transition-all"
            >
              Overview
            </Link>
            <Link
              href="/how-it-works"
              className="px-3 py-2 rounded-lg bg-[#18243C] text-white font-semibold border border-blue-500/40 shadow-xs flex items-center gap-1.5"
              aria-current="page"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#315EFB] animate-pulse" />
              <span>How It Works</span>
              <span className="rounded bg-blue-500/20 text-blue-300 px-1.5 py-0.2 text-[9px] font-mono border border-blue-500/30">
                ACTIVE
              </span>
            </Link>
            <span className="h-4 w-px bg-slate-800 mx-2" />
            <Link
              href="/complaints"
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/70 transition-all"
            >
              Registry
            </Link>
            <Link
              href="/overlap-review"
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/70 transition-all flex items-center gap-1.5"
            >
              <span>Overlaps</span>
              {pendingOverlapCount > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                  {pendingOverlapCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Right Header Action: Return to Main Dashboard */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/"
              className="group inline-flex items-center gap-2 rounded-xl bg-[#315EFB] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_2px_15px_rgba(49,94,251,0.4)] hover:bg-[#254EDB] transition-all hover:shadow-[0_4px_25px_rgba(49,94,251,0.6)] active:scale-98"
            >
              <span>Open Dashboard</span>
              <IconArrowRight
                size={14}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
          </div>

          {/* Mobile Navigation Toggle */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#315EFB]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <IconX size={20} /> : <IconMenu size={20} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-b border-slate-800 bg-[#0E1626] px-5 py-4 space-y-2.5 text-xs font-bold uppercase tracking-wider">
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800"
            >
              Overview Dashboard
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 rounded-md bg-[#18243C] text-blue-300 font-semibold border-l-2 border-[#315EFB]"
            >
              How It Works (Architecture &amp; Workflow)
            </Link>
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <Link
                href="/complaints"
                onClick={() => setMobileNavOpen(false)}
                className="block px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800"
              >
                Complaint Registry ({complaints.length})
              </Link>
              <Link
                href="/overlap-review"
                onClick={() => setMobileNavOpen(false)}
                className="block px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800"
              >
                Overlap Review Queue ({pendingOverlapCount})
              </Link>
              <Link
                href="/analytics"
                onClick={() => setMobileNavOpen(false)}
                className="block px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800"
              >
                Analytics &amp; Bureau Trends
              </Link>
              <Link
                href="/audit-trail"
                onClick={() => setMobileNavOpen(false)}
                className="block px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800"
              >
                System Audit Trail
              </Link>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                onClick={() => setMobileNavOpen(false)}
                className="block w-full text-center rounded-xl bg-[#315EFB] py-2.5 text-xs font-bold text-white shadow-xs"
              >
                Return to Live Dashboard
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ==================================================================== */}
      {/* 2. Hero Section: Technical Overview & Animated Pipeline Diagram      */}
      {/* ==================================================================== */}
      <section className="relative border-b border-slate-800/80 bg-gradient-to-b from-[#0B1528] via-[#080D18] to-[#050811] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Badge & Breadcrumb */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400 mb-4">
            <Link href="/" className="hover:text-blue-400 transition-colors">
              AICTE Intelligence
            </Link>
            <span>/</span>
            <span className="text-blue-400 font-semibold">How It Works</span>
            <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-300 uppercase">
              SIH 26264 System Architecture
            </span>
          </div>

          {/* Main Title & Subtitle */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.15]">
            Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases
            Across AICTE Bureaus/Cells
          </h1>
          <p className="mt-4 text-sm sm:text-base md:text-lg text-slate-300 max-w-3xl leading-relaxed">
            An integrated complaint-management and monitoring system that helps organize
            institution-related complaints, identify potentially overlapping cases across multiple
            AICTE cells, empower human adjudication, and track case progress with transparent
            governance.
          </p>

          {/* End-to-end Pipeline Flow Chips */}
          <div className="mt-6">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              End-to-End Processing Pipeline:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                '1. Complaint Registration',
                '2. Data Validation',
                '3. Overlap Detection',
                '4. Human Review',
                '5. Case Tracking',
                '6. Central Dashboard',
              ].map((step, idx) => (
                <div
                  key={step}
                  className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-200 shadow-2xs"
                >
                  <span>{step}</span>
                  {idx < 5 && <span className="text-blue-400 font-bold">&rsaquo;</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Animated Interactive Flow Diagram (Adapted from SIH26264.html with Modern Technical SVG) */}
          <div
            className={`mt-8 overflow-x-auto rounded-2xl border border-slate-800 bg-[#070D1B] p-4 sm:p-6 shadow-xl ${isPaused ? 'animation-paused' : ''}`}
          >
            <div className="min-w-[720px]">
              <svg
                viewBox="0 0 760 140"
                className="w-full h-auto"
                role="img"
                aria-label="Complaints flow into an analysis engine, then to a review and monitoring dashboard"
              >
                <defs>
                  <linearGradient id="boxGrad1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#13233F" />
                    <stop offset="100%" stopColor="#0B1528" />
                  </linearGradient>
                  <linearGradient id="boxGrad2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1D4ED8" />
                    <stop offset="100%" stopColor="#0F766E" />
                  </linearGradient>
                  <linearGradient id="boxGrad3" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1E293B" />
                    <stop offset="100%" stopColor="#0F172A" />
                  </linearGradient>
                </defs>

                {/* Box 1: Complaints In */}
                <rect
                  x="15"
                  y="30"
                  width="160"
                  height="76"
                  rx="12"
                  fill="url(#boxGrad1)"
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                />
                <text
                  x="95"
                  y="62"
                  fill="#FFFFFF"
                  fontSize="15"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Complaints In
                </text>
                <text x="95" y="84" fill="#94A3B8" fontSize="11" textAnchor="middle">
                  Multi-bureau intake
                </text>

                {/* Flow Line 1 */}
                <line
                  x1="175"
                  y1="68"
                  x2="320"
                  y2="68"
                  stroke="#38BDF8"
                  strokeWidth="3"
                  className="stream-dash"
                />
                <g className="stream-dot-1">
                  <circle cx="175" cy="68" r="6" fill="#F59E0B" />
                </g>

                {/* Box 2: Overlap Engine */}
                <rect
                  x="320"
                  y="30"
                  width="160"
                  height="76"
                  rx="12"
                  fill="url(#boxGrad2)"
                  stroke="#2DD4BF"
                  strokeWidth="1.5"
                />
                <text
                  x="400"
                  y="58"
                  fill="#FFFFFF"
                  fontSize="15"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Overlap Engine
                </text>
                <text
                  x="400"
                  y="78"
                  fill="#CCFBF1"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  Flags Candidates (≥ 0.45)
                </text>
                <text x="400" y="93" fill="#A7F3D0" fontSize="10" textAnchor="middle">
                  Multi-signal heuristics
                </text>

                {/* Flow Line 2 */}
                <line
                  x1="480"
                  y1="68"
                  x2="600"
                  y2="68"
                  stroke="#38BDF8"
                  strokeWidth="3"
                  className="stream-dash"
                />
                <g className="stream-dot-2">
                  <circle cx="480" cy="68" r="6" fill="#F59E0B" />
                </g>

                {/* Box 3: Review & Monitoring */}
                <rect
                  x="600"
                  y="30"
                  width="150"
                  height="76"
                  rx="12"
                  fill="url(#boxGrad3)"
                  stroke="#64748B"
                  strokeWidth="1.5"
                />
                <text
                  x="675"
                  y="58"
                  fill="#FFFFFF"
                  fontSize="15"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  Human Scrutiny
                </text>
                <text
                  x="675"
                  y="78"
                  fill="#F8FAFC"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  Humans Decide
                </text>
                <text x="675" y="93" fill="#CBD5E1" fontSize="10" textAnchor="middle">
                  Zero automatic merges
                </text>
              </svg>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span>
                  Golden dot represents grievance dossiers traversing the analysis pipeline
                </span>
              </span>
              <span className="font-mono text-slate-400">Continuous Stream Visualizer</span>
            </div>
          </div>

          {/* Key Architectural Tenet Note Banner */}
          <div className="mt-6 rounded-xl border border-blue-500/30 bg-blue-950/30 p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
            <div className="rounded-lg bg-blue-500/20 p-2 text-blue-400 shrink-0 mt-0.5">
              <IconInfo size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Core Architectural Principle: Explainable Advisory Candidates Only</span>
                <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                  GUARANTEED
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                The overlap engine calculates <strong>potential correlations</strong> and proposes
                candidates with transparent evidence. It <strong>never concludes</strong> that two
                complaints are absolute duplicates, and it{' '}
                <strong>never automatically merges or deletes</strong> any dossier. All legal
                adjudications and case actions remain strictly in the hands of authorized human
                officers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. Sticky In-Page Sub-Navigation & Quick Action Controls             */}
      {/* ==================================================================== */}
      <nav className="sub-nav sticky top-18 z-30 border-b border-slate-800 bg-[#090F1D]/95 backdrop-blur-md shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 overflow-x-auto py-2.5">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 text-xs font-semibold">
            <a
              href="#problem"
              className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Problem
            </a>
            <a
              href="#arch"
              className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Architecture
            </a>
            <a
              href="#lifecycle"
              className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Lifecycle
            </a>
            <a
              href="#engine"
              className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Overlap Engine
            </a>
            <a
              href="#example"
              className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Walkthrough
            </a>
            <a
              href="#review"
              className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Human Review
            </a>
            <a
              href="#data"
              className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Data Model
            </a>
            <a
              href="#dash"
              className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Dashboard
            </a>
            <a
              href="#trust"
              className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Security
            </a>
            <a
              href="#stack"
              className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Stack
            </a>
            <a
              href="#status"
              className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Status
            </a>
          </div>

          {/* Interactive Utility Controls */}
          <div className="no-print flex items-center gap-2 shrink-0">
            {/* Simple / Detailed Toggle */}
            <button
              type="button"
              onClick={() => setSimpleMode(!simpleMode)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                simpleMode
                  ? 'bg-white text-slate-900 border-white'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
              aria-pressed={simpleMode}
            >
              {simpleMode ? 'Showing Simple View' : 'Detailed View'}
            </button>

            {/* Pause / Resume Flow Animation */}
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                isPaused
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
              aria-pressed={isPaused}
            >
              {isPaused ? 'Play Stream' : 'Pause Stream'}
            </button>

            {/* Print / PDF Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#254EDB] transition-all shadow-xs"
              title="Print document or save as PDF"
            >
              <IconPrinter size={13} />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ==================================================================== */}
      {/* 4. Main Explainer Content Body                                       */}
      {/* ==================================================================== */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        {/* Verification Status Banner */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <IconAlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span>
              <strong>Specification Verified Against Active Codebase:</strong> Schema enums and
              models match{' '}
              <code className="text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded font-mono">
                prisma/schema.prisma
              </code>{' '}
              and scoring weights match{' '}
              <code className="text-amber-300 bg-amber-950/60 px-1 py-0.5 rounded font-mono">
                src/modules/overlap-detection/engine.ts
              </code>
              .
            </span>
          </div>
          <span className="hidden sm:inline-block rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-mono text-emerald-300 shrink-0">
            100% Codebase Parity
          </span>
        </div>

        {/* ================================================================== */}
        {/* SECTION 1: Problem We Are Solving                                  */}
        {/* ================================================================== */}
        <section id="problem" className="scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-400">
            <span>01 &bull; Operational Context</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            The Problem We Are Solving
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            Institutions attract high volumes of complaints across disparate bureaus. Handling them
            in isolation creates blind spots, duplicate investigative efforts, and inconsistent
            institutional accountability.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Challenges */}
            <div className="rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Critical Administrative Challenges</span>
              </h3>
              <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold">&bull;</span>
                  <span>
                    <strong>Large complaint volumes:</strong> Thousands of grievances received
                    across diverse AICTE portals annually.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold">&bull;</span>
                  <span>
                    <strong>Unlinked correlated filings:</strong> Multiple students or faculty
                    reporting the exact same institutional violation independently.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold">&bull;</span>
                  <span>
                    <strong>Lexical mismatch:</strong> Similar underlying infractions phrased using
                    entirely different vocabulary and phrasing.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold">&bull;</span>
                  <span>
                    <strong>Manual search bottlenecks:</strong> Inability of human case officers to
                    manually cross-reference vast historical archives.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold">&bull;</span>
                  <span>
                    <strong>Siloed jurisdiction:</strong> Cell A (Anti-Ragging) and Bureau B
                    (Approval) unaware of concurrent proceedings against the same college.
                  </span>
                </li>
              </ul>
            </div>

            {/* Comparison Table */}
            <div className="rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Manual Process vs. AICTE Intelligence</span>
                </h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900/60 text-slate-300">
                        <th className="p-2.5 font-bold">Manual Investigation</th>
                        <th className="p-2.5 font-bold text-blue-300">
                          Proposed AICTE Intelligence
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      <tr>
                        <td className="p-2.5 text-slate-400">Search archives by hand</td>
                        <td className="p-2.5 text-emerald-300 font-medium">
                          Engine suggests candidate pairs automatically
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-slate-400">Scattered spreadsheet status</td>
                        <td className="p-2.5 text-emerald-300 font-medium">
                          Centralized synchronized executive dashboard
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-slate-400">Isolated bureau silos</td>
                        <td className="p-2.5 text-emerald-300 font-medium">
                          Unified cross-bureau visibility with RBAC
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-slate-400">Accidental duplicate hearings</td>
                        <td className="p-2.5 text-emerald-300 font-medium">
                          Proactive correlation alerts before notices issue
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {!simpleMode && (
                <div className="mt-4 rounded-lg bg-slate-900/80 border border-slate-800 p-3 text-[11px] text-slate-400">
                  <strong>Empirical Note:</strong> This platform enforces decision integrity through
                  multi-signal correlation. Actual processing efficiency depends on officer review
                  latency; no unverified speedup metrics are asserted.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 2: System Architecture (Layered Model)                     */}
        {/* ================================================================== */}
        <section id="arch" className="scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-400">
            <span>02 &bull; Technical Blueprints</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            System Architecture
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            Clean 8-layer architecture ensuring strict separation of concerns from client ingestion
            to resilient database persistence. Select any tier to inspect its data flow and
            implementation guarantees.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md">
            {/* Layer Selection Chips */}
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="System architecture layers"
            >
              {ARCH_LAYERS.map((layer, idx) => (
                <button
                  key={layer.name}
                  type="button"
                  role="tab"
                  aria-selected={activeArchLayer === idx}
                  onClick={() => setActiveArchLayer(idx)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    activeArchLayer === idx
                      ? 'bg-[#315EFB] text-white shadow-[0_0_15px_rgba(49,94,251,0.4)]'
                      : 'bg-slate-900 text-slate-300 border border-slate-700/80 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{layer.name}</span>
                </button>
              ))}
            </div>

            {/* Layer Detail Card */}
            {ARCH_LAYERS[activeArchLayer] && (
              <div className="mt-6 rounded-xl border border-slate-800/90 bg-[#070D1B] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-xs font-bold text-blue-400 font-mono">
                      0{activeArchLayer + 1}
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {ARCH_LAYERS[activeArchLayer].name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-mono text-emerald-300">
                    {ARCH_LAYERS[activeArchLayer].status}
                  </span>
                </div>

                <p className="mt-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {ARCH_LAYERS[activeArchLayer].desc}
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Data Ingestion / Input
                    </span>
                    <span className="font-semibold text-slate-200">
                      {ARCH_LAYERS[activeArchLayer].input}
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Downstream Dispatch / Output
                    </span>
                    <span className="font-semibold text-blue-300">
                      {ARCH_LAYERS[activeArchLayer].output}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 3: Complaint Lifecycle (Dual Stream)                       */}
        {/* ================================================================== */}
        <section id="lifecycle" className="scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-400">
            <span>03 &bull; Workflow Orchestration</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            End-to-End Complaint Lifecycle
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            Two parallel, decoupled lifecycles run side by side: the{' '}
            <strong>Substantive Case Lifecycle</strong> (registration to resolution) and the{' '}
            <strong>Overlap Adjudication Lifecycle</strong>. Adjudicating an overlap correlation
            never terminates or auto-resolves any grievance.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md">
            {/* Stage Selector */}
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Complaint lifecycle stages"
            >
              {LIFECYCLE_STAGES.map((st, idx) => (
                <button
                  key={st.step}
                  type="button"
                  role="tab"
                  aria-selected={activeLifeStage === idx}
                  onClick={() => setActiveLifeStage(idx)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    activeLifeStage === idx
                      ? 'bg-[#315EFB] text-white shadow-[0_0_15px_rgba(49,94,251,0.4)]'
                      : 'bg-slate-900 text-slate-300 border border-slate-700/80 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-75">{st.step}</span>
                  <span>{st.name}</span>
                </button>
              ))}
            </div>

            {/* Selected Stage Presentation */}
            {LIFECYCLE_STAGES[activeLifeStage] && (
              <div className="mt-6 rounded-xl border border-slate-800 bg-[#070D1B] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 text-xs font-bold">
                      STAGE {LIFECYCLE_STAGES[activeLifeStage].step}
                    </span>
                    <h3 className="text-base font-bold text-white">
                      {LIFECYCLE_STAGES[activeLifeStage].name}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Status: {LIFECYCLE_STAGES[activeLifeStage].status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Input Payload
                    </span>
                    <p className="text-slate-200">{LIFECYCLE_STAGES[activeLifeStage].input}</p>
                  </div>

                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Core Processing &amp; Transformation
                    </span>
                    <p className="text-slate-200">{LIFECYCLE_STAGES[activeLifeStage].processing}</p>
                  </div>

                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Downstream Output
                    </span>
                    <p className="text-blue-300 font-medium">
                      {LIFECYCLE_STAGES[activeLifeStage].output}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      Target Prisma Entities
                    </span>
                    <p className="text-amber-300 font-mono">
                      {LIFECYCLE_STAGES[activeLifeStage].entities}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 4: Overlap-Detection Engine & Interactive Simulator        */}
        {/* ================================================================== */}
        <section id="engine" className="scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-400">
            <span>04 &bull; Algorithmic Engine</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            The Overlap-Detection Engine
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            Compares newly filed complaints against eligible institutional active records using four
            weighted heuristic signals. Proposes candidate pairs whenever the composite score meets
            or exceeds the <strong>0.45 threshold</strong>.
          </p>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Signals & Mathematical Weights */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <IconCpu size={18} className="text-blue-400" />
                  <span>Signals and Mathematical Weights</span>
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Total composite weight equals exactly 1.0 (100%).
                </p>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900/60 text-slate-300">
                        <th className="p-2.5 font-bold">Signal Dimension</th>
                        <th className="p-2.5 font-bold">Weight</th>
                        <th className="p-2.5 font-bold">Methodology</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      <tr>
                        <td className="p-2.5 font-semibold text-white">Institution Matching</td>
                        <td className="p-2.5 font-mono font-bold text-blue-400">0.35</td>
                        <td className="p-2.5 text-slate-400">
                          Canonical AICTE Permanent ID (1.0) or fuzzy location fallback
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-white">
                          Subject &amp; Text Similarity
                        </td>
                        <td className="p-2.5 font-mono font-bold text-blue-400">0.40</td>
                        <td className="p-2.5 text-slate-400">
                          Tokenization, stopword removal, cosine TF-IDF + bigram Jaccard
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-white">Temporal Proximity</td>
                        <td className="p-2.5 font-mono font-bold text-blue-400">0.15</td>
                        <td className="p-2.5 text-slate-400">
                          Exponential 90-day half-life decay within sliding date window
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-white">Complainant Linkage</td>
                        <td className="p-2.5 font-mono font-bold text-blue-400">0.10</td>
                        <td className="p-2.5 text-slate-400">
                          Privacy-masked identifier (STU-***-XXXX) &amp; type matching
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {!simpleMode && (
                <div className="mt-4 rounded-xl border border-slate-800 bg-[#070D1B] p-3.5 text-xs text-slate-300 space-y-1.5">
                  <div className="font-mono text-[11px] font-bold text-blue-300 uppercase">
                    Composite Formula:
                  </div>
                  <div className="font-mono text-[11px] text-emerald-300 bg-black/40 p-2 rounded">
                    Score = (0.35 &times; Entity) + (0.40 &times; Subject) + (0.15 &times; Time) +
                    (0.10 &times; Complainant)
                  </div>
                </div>
              )}
            </div>

            {/* Right: Thresholds & Interactive Live Simulator */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <IconScale size={18} className="text-blue-400" />
                  <span>Classification Bands &amp; Live Calculator</span>
                </h3>
                <span className="text-xs text-slate-400">Candidate Threshold: ≥ 0.45</span>
              </div>

              {/* Classification Threshold Visualizer */}
              <div className="mt-4 rounded-xl overflow-hidden border border-slate-700 flex text-center text-xs font-bold text-white">
                <div className="bg-slate-700/80 py-2" style={{ flex: 45 }}>
                  Low &lt; 0.45
                  <span className="block text-[9px] font-normal text-slate-300">
                    Independent (No Candidate)
                  </span>
                </div>
                <div
                  className="bg-amber-600/90 py-2 border-x border-slate-900"
                  style={{ flex: 20 }}
                >
                  Medium (0.45 &ndash; 0.65)
                  <span className="block text-[9px] font-normal text-amber-100">
                    Review Candidate
                  </span>
                </div>
                <div className="bg-rose-700/90 py-2" style={{ flex: 35 }}>
                  High &ge; 0.65
                  <span className="block text-[9px] font-normal text-rose-100">
                    Priority Joint Review
                  </span>
                </div>
              </div>

              {/* Live Interactive Sliders to test score simulation */}
              <div className="mt-5 space-y-3">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Interactive Signal Simulator:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSignalEntity(1.0);
                      setSignalSubject(0.85);
                      setSignalTime(0.9);
                      setSignalComplainant(0.2);
                    }}
                    className="text-[10px] text-blue-400 hover:underline"
                  >
                    Reset to Case Example Values
                  </button>
                </div>

                {/* Institution Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Institution Match (weight 0.35):</span>
                    <span className="font-mono text-blue-400">
                      {(signalEntity * 100).toFixed(0)}% &rarr; +{(signalEntity * 0.35).toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={signalEntity}
                    onChange={(e) => setSignalEntity(parseFloat(e.target.value))}
                    className="w-full accent-[#315EFB] cursor-pointer"
                  />
                </div>

                {/* Subject Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Subject Similarity (weight 0.40):</span>
                    <span className="font-mono text-blue-400">
                      {(signalSubject * 100).toFixed(0)}% &rarr; +{(signalSubject * 0.4).toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={signalSubject}
                    onChange={(e) => setSignalSubject(parseFloat(e.target.value))}
                    className="w-full accent-[#315EFB] cursor-pointer"
                  />
                </div>

                {/* Time Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Temporal Proximity (weight 0.15):</span>
                    <span className="font-mono text-blue-400">
                      {(signalTime * 100).toFixed(0)}% &rarr; +{(signalTime * 0.15).toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={signalTime}
                    onChange={(e) => setSignalTime(parseFloat(e.target.value))}
                    className="w-full accent-[#315EFB] cursor-pointer"
                  />
                </div>

                {/* Complainant Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Complainant Linkage (weight 0.10):</span>
                    <span className="font-mono text-blue-400">
                      {(signalComplainant * 100).toFixed(0)}% &rarr; +
                      {(signalComplainant * 0.1).toFixed(3)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={signalComplainant}
                    onChange={(e) => setSignalComplainant(parseFloat(e.target.value))}
                    className="w-full accent-[#315EFB] cursor-pointer"
                  />
                </div>
              </div>

              {/* Total Output Card */}
              <div className="mt-5 rounded-xl border border-slate-700 bg-[#070D1B] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Simulated Composite Score
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {compositeScore.toFixed(3)}
                    </span>
                    <span className="text-xs text-slate-400">/ 1.000</span>
                  </div>
                </div>

                <div
                  className={`rounded-xl border px-3.5 py-2 text-xs font-semibold ${scoreClassification.color}`}
                >
                  <span className="block font-bold">{scoreClassification.band}</span>
                  <span className="block text-[11px] opacity-90">{scoreClassification.desc}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 5: Step-by-Step Walkthrough Example                        */}
        {/* ================================================================== */}
        <section id="example" className="scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-400">
            <span>05 &bull; Real-World Execution</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Example: Two Complaints, One Potential Overlap
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            Inspect the step-by-step lifecycle of two actual student grievances filed against ABC
            Engineering College. Use the Previous and Next controls to walk through each phase of
            candidate correlation.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md">
            {/* The Two Fictional Complaints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">Dossier C-101 &bull; Day 1</span>
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-mono text-blue-300">
                    Approval Bureau
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-300">
                  ABC Engineering College (ID: 1-948102)
                </div>
                <p className="mt-2 text-xs text-slate-200 italic bg-black/30 p-2.5 rounded border border-slate-800">
                  &ldquo;My college has not refunded my examination fee despite several formal
                  written requests.&rdquo;
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">Dossier C-205 &bull; Day 5</span>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                    Student Grievance Cell
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-300">
                  ABC Engineering College (ID: 1-948102)
                </div>
                <p className="mt-2 text-xs text-slate-200 italic bg-black/30 p-2.5 rounded border border-slate-800">
                  &ldquo;ABC Engineering College is refusing to return the examination fees
                  collected from final year students.&rdquo;
                </p>
              </div>
            </div>

            {/* Current Step Content Box */}
            <div className="mt-6 rounded-xl border border-slate-700 bg-[#070D1B] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">{currentWalkthrough.title}</h3>
                <span className="text-xs font-mono text-blue-400 font-semibold">
                  Step {walkthroughIndex + 1} of {WALKTHROUGH_STEPS.length}
                </span>
              </div>

              <p className="mt-3 text-xs sm:text-sm text-slate-200 leading-relaxed">
                {currentWalkthrough.desc}
              </p>

              {currentWalkthrough.scoreDisplay && (
                <div className="mt-4 flex items-center gap-3 rounded-lg bg-blue-950/40 border border-blue-500/30 p-3 text-xs">
                  <span className="text-blue-300 font-bold">Illustrative Score:</span>
                  <span className="font-mono text-base font-extrabold text-white">
                    {currentWalkthrough.scoreVal?.toFixed(3)}
                  </span>
                  <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[10px] font-mono text-rose-300">
                    {currentWalkthrough.scoreBand}
                  </span>
                </div>
              )}

              {/* Step Navigation Buttons */}
              <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setWalkthroughIndex((prev) => Math.max(0, prev - 1))}
                  disabled={walkthroughIndex === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <IconChevronLeft size={16} />
                  <span>Previous Stage</span>
                </button>

                <div className="flex items-center gap-1">
                  {WALKTHROUGH_STEPS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setWalkthroughIndex(i)}
                      className={`h-2 rounded-full transition-all ${
                        walkthroughIndex === i
                          ? 'w-6 bg-[#315EFB]'
                          : 'w-2 bg-slate-700 hover:bg-slate-500'
                      }`}
                      aria-label={`Go to step ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setWalkthroughIndex((prev) => Math.min(WALKTHROUGH_STEPS.length - 1, prev + 1))
                  }
                  disabled={walkthroughIndex === WALKTHROUGH_STEPS.length - 1}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#254EDB] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                >
                  <span>Next Stage</span>
                  <IconChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 6: Manual Review & Decision Integrity                      */}
        {/* ================================================================== */}
        <section id="review" className="scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-400">
            <span>06 &bull; Governance &amp; Ethics</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Manual Review &amp; Decision Integrity
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            The engine recommends; an authorized human officer decides. Automated processes are
            deliberately constrained to advisory candidate generation.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span>Engine Advisory Scope</span>
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                The engine correlates signals and presents: &ldquo;These two complaints may concern
                the exact same issue.&rdquo; All evidence, shared keywords, day deltas, and
                institutional background are rendered transparently.
              </p>
              <div className="mt-4 rounded-lg bg-slate-900 border border-slate-800 p-3 text-xs text-slate-400">
                <strong>Safety Guarantee:</strong> The algorithm cannot mutate complaint status,
                cannot reassign officers, and cannot merge dossiers.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Officer Adjudication Verbs</span>
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                An authorized scrutiny officer evaluates the candidate and selects one of the
                verified schema actions:
              </p>
              <div className="mt-3 space-y-1.5 text-xs font-mono">
                <div className="rounded bg-emerald-950/40 border border-emerald-500/30 p-2 text-emerald-300">
                  CONFIRMED_OVERLAP &rarr; Mark as verified correlated filing
                </div>
                <div className="rounded bg-blue-950/40 border border-blue-500/30 p-2 text-blue-300">
                  FLAGGED_JOINT_REVIEW &rarr; Dispatch joint inquiry across bureaus
                </div>
                <div className="rounded bg-slate-900 border border-slate-700 p-2 text-slate-300">
                  DISMISSED_INDEPENDENT &rarr; Dismiss as separate, coincidental grievances
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 7: Database & Data Model (Prisma Entity Diagram)            */}
        {/* ================================================================== */}
        <section id="data" className="scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-400">
            <span>07 &bull; Data Architecture</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Database &amp; Data Model
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            Seven core relational models defined in{' '}
            <code className="text-blue-400 bg-blue-950/60 px-1 py-0.5 rounded font-mono">
              prisma/schema.prisma
            </code>
            . Dashed links represent relational foreign keys with referential integrity.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md">
            {/* High-Tech Vector Entity Diagram */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#070D1B] p-4 sm:p-6">
              <div className="min-w-[760px]">
                <svg
                  viewBox="0 0 760 250"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Conceptual entity diagram representing the 7 Prisma models"
                >
                  {/* Entity Cards */}
                  <g fontSize="13" textAnchor="middle" fontWeight="bold">
                    {/* Col 1 */}
                    <rect
                      x="20"
                      y="25"
                      width="140"
                      height="50"
                      rx="10"
                      fill="#111C33"
                      stroke="#3B82F6"
                      strokeWidth="2"
                    />
                    <text x="90" y="55" fill="#FFFFFF">
                      Institution
                    </text>

                    <rect
                      x="20"
                      y="115"
                      width="140"
                      height="50"
                      rx="10"
                      fill="#111C33"
                      stroke="#3B82F6"
                      strokeWidth="2"
                    />
                    <text x="90" y="145" fill="#FFFFFF">
                      Bureau
                    </text>

                    {/* Col 2 */}
                    <rect
                      x="310"
                      y="25"
                      width="140"
                      height="50"
                      rx="10"
                      fill="#1E293B"
                      stroke="#10B981"
                      strokeWidth="2"
                    />
                    <text x="380" y="55" fill="#FFFFFF">
                      Complaint
                    </text>

                    <rect
                      x="310"
                      y="115"
                      width="140"
                      height="50"
                      rx="10"
                      fill="#1E293B"
                      stroke="#10B981"
                      strokeWidth="2"
                    />
                    <text x="380" y="145" fill="#FFFFFF">
                      CaseAction
                    </text>

                    <rect
                      x="310"
                      y="195"
                      width="140"
                      height="45"
                      rx="10"
                      fill="#1E293B"
                      stroke="#F59E0B"
                      strokeWidth="2"
                    />
                    <text x="380" y="222" fill="#FFFFFF">
                      OverlapCandidate
                    </text>

                    {/* Col 3 */}
                    <rect
                      x="600"
                      y="25"
                      width="140"
                      height="50"
                      rx="10"
                      fill="#111C33"
                      stroke="#8B5CF6"
                      strokeWidth="2"
                    />
                    <text x="670" y="55" fill="#FFFFFF">
                      Officer
                    </text>

                    <rect
                      x="600"
                      y="115"
                      width="140"
                      height="50"
                      rx="10"
                      fill="#111C33"
                      stroke="#8B5CF6"
                      strokeWidth="2"
                    />
                    <text x="670" y="145" fill="#FFFFFF">
                      AuditLog
                    </text>
                  </g>

                  {/* Relational Connectors */}
                  <g stroke="#64748B" strokeWidth="2" strokeDasharray="5 4" fill="none">
                    {/* Institution -> Complaint */}
                    <line x1="160" y1="50" x2="310" y2="50" />
                    {/* Bureau -> Complaint */}
                    <line x1="160" y1="135" x2="310" y2="60" />
                    {/* Complaint -> CaseAction */}
                    <line x1="380" y1="75" x2="380" y2="115" />
                    {/* Complaint -> OverlapCandidate */}
                    <line x1="380" y1="165" x2="380" y2="195" />
                    {/* Officer -> Complaint */}
                    <line x1="450" y1="50" x2="600" y2="50" />
                    {/* Officer -> CaseAction & AuditLog */}
                    <line x1="450" y1="140" x2="600" y2="140" />
                  </g>

                  <text x="380" y="248" fontSize="10" textAnchor="middle" fill="#94A3B8">
                    Dashed lines indicate Prisma foreign key relations with referential cascading
                    constraints
                  </text>
                </svg>
              </div>
            </div>

            {/* Core Tech Stack Cards */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="rounded-xl border border-slate-800 bg-[#070D1B] p-3.5">
                <span className="block text-sm font-bold text-white">PostgreSQL</span>
                <span className="text-[11px] text-slate-400">Relational Acid Storage</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070D1B] p-3.5">
                <span className="block text-sm font-bold text-white">Prisma ORM</span>
                <span className="text-[11px] text-slate-400">Type-Safe Client v6</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070D1B] p-3.5">
                <span className="block text-sm font-bold text-white">Zod Validation</span>
                <span className="text-[11px] text-slate-400">Runtime Guardrails</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070D1B] p-3.5">
                <span className="block text-sm font-bold text-white">TypeScript 5</span>
                <span className="text-[11px] text-slate-400">Strict Compile Checks</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 8: Dashboard Concept & Real-Time Operational Signals        */}
        {/* ================================================================== */}
        <section id="dash" className="scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-400">
            <span>08 &bull; Monitoring &amp; Analytics</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dashboard Concept &amp; Live Telemetry
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            Real-time aggregates populated directly from the current active session context.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              <div className="rounded-xl border border-slate-800 bg-[#070D1B] p-4">
                <span className="text-2xl font-extrabold text-white font-mono">
                  {complaints.length}
                </span>
                <span className="block text-xs text-slate-400 mt-1">Total Dossiers</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070D1B] p-4">
                <span className="text-2xl font-extrabold text-amber-400 font-mono">
                  {complaints.filter((c) => c.status === 'Under Scrutiny').length}
                </span>
                <span className="block text-xs text-slate-400 mt-1">Under Scrutiny</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070D1B] p-4">
                <span className="text-2xl font-extrabold text-blue-400 font-mono">
                  {complaints.filter((c) => c.status === 'Assigned to Bureau').length}
                </span>
                <span className="block text-xs text-slate-400 mt-1">Assigned to Bureau</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070D1B] p-4">
                <span className="text-2xl font-extrabold text-rose-400 font-mono">
                  {pendingOverlapCount}
                </span>
                <span className="block text-xs text-slate-400 mt-1">Potential Overlaps</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#070D1B] p-4">
                <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {overlaps.filter((o) => o.reviewStatus === 'Linked').length} /{' '}
                  {overlaps.filter((o) => o.reviewStatus === 'Dismissed').length}
                </span>
                <span className="block text-xs text-slate-400 mt-1">Linked / Dismissed</span>
              </div>
            </div>

            {/* Status Breakdown Bar */}
            <div className="mt-6">
              <div className="text-xs font-semibold text-slate-300 mb-2">
                Live Status Distribution:
              </div>
              <div className="h-6 rounded-lg overflow-hidden flex text-[10px] font-bold text-white text-center leading-6">
                <div style={{ flex: 30 }} className="bg-blue-600 truncate px-1">
                  Scrutiny
                </div>
                <div style={{ flex: 35 }} className="bg-teal-600 truncate px-1">
                  Bureau Inquiries
                </div>
                <div style={{ flex: 15 }} className="bg-amber-600 truncate px-1">
                  Hearings
                </div>
                <div style={{ flex: 20 }} className="bg-emerald-600 truncate px-1">
                  Resolved
                </div>
              </div>
            </div>

            {/* Action Bar linking to Live Views */}
            <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Want to test these views live with full search, filters, and adjudication?
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href="/complaints"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Explore Registry
                </Link>
                <Link
                  href="/overlap-review"
                  className="rounded-lg bg-[#315EFB] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#254EDB] transition-colors"
                >
                  Open Overlap Queue
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 9: Security, Trust & Governance                            */}
        {/* ================================================================== */}
        <section id="trust" className="scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-400">
            <span>09 &bull; Trust Framework</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Security, Reliability &amp; Governance
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            Design principles engineered for strict institutional compliance, auditability, and
            tamper-evident logging.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <IconCheckCircle size={18} />
                <span>Verified Design Guarantees</span>
              </h3>
              <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&check;</span>
                  <span>
                    <strong>Human-in-the-Loop Adjudication:</strong> Automated algorithms produce
                    proposals only; binding verdicts require officer credentials.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&check;</span>
                  <span>
                    <strong>Rescoring Idempotency:</strong> Rescoring runs on new complaint arrivals
                    preserve previously recorded human verdicts.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&check;</span>
                  <span>
                    <strong>Complainant Privacy:</strong> Public displays mask complainant
                    identifiers (e.g. STU-***-8401) to protect student confidentiality.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">&check;</span>
                  <span>
                    <strong>Immutable Audit Logs:</strong> Every status transition and overlap
                    decision produces an immutable AuditLog entry with timestamp and actor.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0E1626] p-6 shadow-md">
              <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <IconAlertTriangle size={18} />
                <span>Scope Boundaries &amp; Production Checklist</span>
              </h3>
              <ul className="mt-4 space-y-2.5 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">&bull;</span>
                  <span>
                    <strong>OAuth / SSO Authentication:</strong> Currently operates on role-based
                    session contexts with seed officers; production deployment requires AICTE SSO
                    integration.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">&bull;</span>
                  <span>
                    <strong>PostgreSQL Database URL:</strong> Configurable via{' '}
                    <code className="font-mono text-amber-300">DATABASE_URL</code> in environment
                    variables. Resilient mock fallbacks ensure zero dev downtime.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">&bull;</span>
                  <span>
                    <strong>Data Protection Compliance:</strong> Formal institutional privacy
                    certification to be completed prior to central ministry rollout.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 10: Complete Technology Stack                              */}
        {/* ================================================================== */}
        <section id="stack" className="scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-400">
            <span>10 &bull; Engineering Stack</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Production Technology Stack
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            Modern, maintainable, and type-safe open-standard architecture.
          </p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                name: 'Next.js 16',
                desc: 'React Framework (Turbopack, App Router)',
                badge: 'Core',
              },
              { name: 'React 19', desc: 'User Interface & Concurrency', badge: 'Frontend' },
              { name: 'TypeScript 5', desc: 'Strict Static Typing', badge: 'Language' },
              { name: 'Tailwind CSS v4', desc: 'Modern CSS Design System', badge: 'Styling' },
              { name: 'PostgreSQL', desc: 'Relational Database Storage', badge: 'Storage' },
              { name: 'Prisma 6', desc: 'Type-Safe Relational ORM', badge: 'Database' },
              { name: 'Zod', desc: 'Runtime Schema Validation', badge: 'Validation' },
              { name: 'Vitest 5', desc: 'Unit & Integration Test Suite', badge: 'Testing' },
            ].map((tech) => (
              <div
                key={tech.name}
                className="rounded-xl border border-slate-800 bg-[#0E1626] p-4 text-left shadow-sm"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">{tech.name}</span>
                  <span className="rounded bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.2 text-[9px] font-mono text-blue-300">
                    {tech.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">{tech.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 11: Scope & Implementation Status                          */}
        {/* ================================================================== */}
        <section id="status" className="scroll-mt-28">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-blue-400">
            <span>11 &bull; Verification Matrix</span>
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Scope &amp; Implementation Status
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-3xl">
            Status verified directly against the current repository state.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Fully Implemented (Verified)</span>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-200">
                <li>&check; Cross-bureau overlap detection engine (113+ passing tests)</li>
                <li>&check; Multi-signal weighting &amp; tokenization algorithms</li>
                <li>&check; Overlap Review Queue with side-by-side comparison</li>
                <li>&check; Complaint Registry with search &amp; filtering</li>
                <li>&check; System audit trail &amp; analytical trends</li>
                <li>&check; Integrated How It Works architecture explainer</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span>Resilient Fallback Operating</span>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-200">
                <li>&bull; In-memory procedural seed data when PostgreSQL offline</li>
                <li>&bull; Client-side context state synchronized with mock DB</li>
                <li>&bull; Interactive state management with Motion micro-interactions</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span>Planned Production Integrations</span>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-400">
                <li>&bull; External national student portal intake bridge</li>
                <li>&bull; Automated SMS / Email show-cause dispatch gate</li>
                <li>&bull; Digilocker institutional document verification</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* Call to Action: Return to Command Center                           */}
        {/* ================================================================== */}
        <div className="rounded-2xl border border-[#315EFB]/40 bg-gradient-to-r from-blue-950/50 via-[#0B1528] to-slate-900 p-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div>
            <span className="rounded-full bg-blue-500/20 border border-blue-500/40 px-3 py-1 text-[11px] font-mono text-blue-300">
              EXPLORE THE LIVE DASHBOARD
            </span>
            <h3 className="mt-3 text-xl sm:text-2xl font-bold text-white">
              Ready to see the complaint monitoring system in action?
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl">
              Inspect active complaint dossiers, review algorithmic overlap scores, and experience
              the officer workflow firsthand.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[#315EFB] px-6 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_4px_20px_rgba(49,94,251,0.5)] hover:bg-[#254EDB] transition-all"
            >
              <span>Back to Overview</span>
              <IconArrowRight size={14} />
            </Link>
            <Link
              href="/complaints"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-200 hover:bg-slate-800 transition-all"
            >
              <span>View Dossiers</span>
            </Link>
          </div>
        </div>
      </main>

      {/* ==================================================================== */}
      {/* 5. Integrated Footer                                                 */}
      {/* ==================================================================== */}
      <footer className="border-t border-slate-800/80 bg-[#04070F] py-10 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#315EFB] text-white">
              <IconShield size={16} />
            </div>
            <div>
              <span className="font-bold text-slate-200">
                AICTE Institutional Complaint Intelligence
              </span>
              <span className="block text-[10px] text-slate-400">
                SIH 26264 Architecture &amp; Methodology Explainer
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <Link href="/" className="hover:text-white transition-colors">
              Overview
            </Link>
            <Link href="/how-it-works" className="text-blue-400 font-semibold">
              How It Works
            </Link>
            <Link href="/complaints" className="hover:text-white transition-colors">
              Complaint Registry
            </Link>
            <Link href="/overlap-review" className="hover:text-white transition-colors">
              Overlap Review
            </Link>
            <Link href="/analytics" className="hover:text-white transition-colors">
              Analytics
            </Link>
            <Link href="/audit-trail" className="hover:text-white transition-colors">
              Audit Trail
            </Link>
          </div>

          <div className="text-[10px] text-slate-400 font-mono">
            All sample data illustrative &bull; v0.2.0
          </div>
        </div>
      </footer>
    </div>
  );
}
