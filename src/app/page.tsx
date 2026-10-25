"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "motion/react";
import { useComplaints } from "../lib/context/complaint-context";
import {
  IconShield,
  IconArrowRight,
  IconFileText,
  IconLayers,
  IconScale,
  IconCheckCircle,
  IconChevronRight,
  IconChevronDown,
  IconMenu,
  IconX,
  IconBarChart,
  IconBuilding,
} from "../components/ui/icons";
import { PriorityBadge, StatusBadge } from "../components/ui/badge";
import { OperationalDashboard } from "../components/dashboard/operational-dashboard";
import { AnimatedNumber } from "../components/motion/animated-number";

export default function MaximalistHomepage() {
  const { complaints, overlaps, pendingOverlapCount } = useComplaints();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Overall Page Scroll Progress for top progress bar
  const { scrollYProgress: pageScrollProgress } = useScroll();
  const smoothPageScroll = useSpring(pageScrollProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });

  // Section Refs for Scroll-Linked Choreography
  const heroRef = useRef<HTMLDivElement>(null);
  const monitorRef = useRef<HTMLDivElement>(null);
  const correlateRef = useRef<HTMLDivElement>(null);
  const resolveRef = useRef<HTMLDivElement>(null);

  // 1. Hero Scroll Choreography
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroHeadlineY = useTransform(heroProgress, [0, 1], [0, -120]);
  const heroOpacity = useTransform(heroProgress, [0, 0.75], [1, 0.05]);
  const heroPanelY = useTransform(heroProgress, [0, 1], [0, 100]);
  const heroGridScale = useTransform(heroProgress, [0, 1], [1, 1.15]);

  // 2. Monitor Sticky Scroll Choreography (Pinned 240vh sequence)
  const { scrollYProgress: monitorProgress } = useScroll({
    target: monitorRef,
    offset: ["start start", "end end"],
  });
  const monitorBigNumScale = useTransform(monitorProgress, [0, 0.35], [1.3, 0.9]);
  const monitorBigNumY = useTransform(monitorProgress, [0, 0.35], [0, -40]);
  const monitorBigNumOpacity = useTransform(monitorProgress, [0.35, 0.65], [1, 0.25]);
  const monitorCardsX = useTransform(monitorProgress, [0.2, 0.7], ["120%", "0%"]);
  const monitorWorkloadOpacity = useTransform(monitorProgress, [0.55, 0.85], [0, 1]);
  const monitorWorkloadY = useTransform(monitorProgress, [0.55, 0.85], [40, 0]);

  // 3. Correlate Sticky Scroll Choreography (Pinned 260vh sequence)
  const { scrollYProgress: correlateProgress } = useScroll({
    target: correlateRef,
    offset: ["start start", "end end"],
  });
  const dossierLeftX = useTransform(correlateProgress, [0.03, 0.26], ["-120%", "0%"]);
  const dossierRightX = useTransform(correlateProgress, [0.03, 0.26], ["120%", "0%"]);
  const connectionLineProgress = useTransform(correlateProgress, [0.18, 0.38], [0, 1]);
  const similarityScoreScale = useTransform(correlateProgress, [0.34, 0.48], [0.5, 1]);
  const similarityScoreOpacity = useTransform(correlateProgress, [0.34, 0.46], [0, 1]);
  const humanReviewBannerY = useTransform(correlateProgress, [0.44, 0.56], [24, 0]);
  const humanReviewBannerOpacity = useTransform(correlateProgress, [0.44, 0.56], [0, 1]);
  const correlateExitOpacity = useTransform(correlateProgress, [0.84, 0.96], [1, 0]);
  const correlateExitY = useTransform(correlateProgress, [0.84, 0.96], [0, -32]);

  // 4. Resolve Sticky Scroll Choreography (Pinned 240vh sequence)
  const { scrollYProgress: resolveProgress } = useScroll({
    target: resolveRef,
    offset: ["start start", "end end"],
  });
  const resolveContentOpacity = useTransform(resolveProgress, [0.02, 0.12, 0.88, 0.98], [0, 1, 1, 0.1]);
  const resolveEntranceY = useTransform(resolveProgress, [0.02, 0.12], [24, 0]);
  const timelineSvgProgress = useTransform(resolveProgress, [0.10, 0.82], [0, 1]);
  const milestone1Opacity = useTransform(resolveProgress, [0.10, 0.24], [0.2, 1]);
  const milestone2Opacity = useTransform(resolveProgress, [0.24, 0.40], [0.2, 1]);
  const milestone3Opacity = useTransform(resolveProgress, [0.40, 0.56], [0.2, 1]);
  const milestone4Opacity = useTransform(resolveProgress, [0.56, 0.72], [0.2, 1]);
  const milestone5Opacity = useTransform(resolveProgress, [0.72, 0.86], [0.2, 1]);

  // Compute live overview metrics
  const totalComplaints = complaints.length;
  const activeCount = useMemo(
    () => complaints.filter((c) => c.status !== "Resolved").length,
    [complaints]
  );
  const criticalCount = useMemo(
    () => complaints.filter((c) => c.priority === "Critical" && c.status !== "Resolved").length,
    [complaints]
  );

  // Status breakdown for preview
  const statusCounts = useMemo(() => {
    return {
      scrutiny: complaints.filter((c) => c.status === "Under Scrutiny").length,
      assigned: complaints.filter((c) => c.status === "Assigned to Bureau").length,
      proceedings: complaints.filter(
        (c) =>
          c.status === "Show-Cause Notice Issued" ||
          c.status === "Institution Response Received" ||
          c.status === "Hearing Scheduled"
      ).length,
      escalated: complaints.filter((c) => c.status === "Escalated").length,
      resolved: complaints.filter((c) => c.status === "Resolved").length,
    };
  }, [complaints]);

  // Top critical cases for live intelligence preview
  const urgentCases = useMemo(() => {
    return complaints
      .filter((c) => c.priority === "Critical" || c.priority === "High")
      .slice(0, 3);
  }, [complaints]);

  // Featured overlap pair for Correlate section
  const featuredOverlap = useMemo(() => {
    const pending = overlaps.find((o) => o.reviewStatus === "Pending") || overlaps[0];
    if (!pending) return null;
    const source = complaints.find((c) => c.id === pending.sourceComplaintId);
    const target = complaints.find((c) => c.id === pending.targetComplaintId);
    return {
      ...pending,
      source,
      target,
    };
  }, [overlaps, complaints]);

  return (
    <div className="relative min-h-screen bg-[#050811] text-slate-100 selection:bg-[#315EFB]/40 selection:text-white">
      {/* 0. Top Scroll Progress Line */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 z-50 bg-gradient-to-r from-[#315EFB] via-[#60A5FA] to-[#10B981] origin-left"
        style={{ scaleX: smoothPageScroll }}
        aria-hidden="true"
      />

      {/* Global Background Technical Grid Texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />

      {/* 1. Cinematic Sticky Top Navigation Bar */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#050811]/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Identity & Technical Coordinates */}
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
            <a
              href="#monitor"
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/70 transition-all"
            >
              01 Monitor
            </a>
            <a
              href="#correlate"
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/70 transition-all"
            >
              02 Correlate
            </a>
            <a
              href="#resolve"
              className="px-3 py-2 rounded-lg hover:text-white hover:bg-slate-800/70 transition-all"
            >
              03 Resolve
            </a>
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

          {/* Right Header Action */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href="#command-center"
              className="group inline-flex items-center gap-2 rounded-xl bg-[#315EFB] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_2px_15px_rgba(49,94,251,0.4)] hover:bg-[#254EDB] transition-all hover:shadow-[0_4px_25px_rgba(49,94,251,0.6)] active:scale-98"
            >
              <span>Command Center</span>
              <IconChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
            </a>
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
            <a
              href="#monitor"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800"
            >
              01 Monitor
            </a>
            <a
              href="#correlate"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800"
            >
              02 Correlate
            </a>
            <a
              href="#resolve"
              onClick={() => setMobileNavOpen(false)}
              className="block px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800"
            >
              03 Resolve
            </a>
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <Link
                href="/complaints"
                onClick={() => setMobileNavOpen(false)}
                className="block px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800"
              >
                Complaint Registry ({totalComplaints})
              </Link>
              <Link
                href="/overlap-review"
                onClick={() => setMobileNavOpen(false)}
                className="block px-3 py-2 rounded-md text-slate-200 hover:bg-slate-800"
              >
                Overlap Review Queue ({pendingOverlapCount})
              </Link>
            </div>
            <div className="pt-2">
              <a
                href="#command-center"
                onClick={() => setMobileNavOpen(false)}
                className="block w-full text-center rounded-xl bg-[#315EFB] py-2.5 text-xs font-bold text-white shadow-xs"
              >
                Open Command Center
              </a>
            </div>
          </div>
        )}
      </motion.header>

      {/* 2. PRIORITY 1: REBUILT HERO (Oversized Editorial & Asymmetric Composition) */}
      <section
        ref={heroRef}
        className="relative min-h-[92vh] flex flex-col justify-between pt-12 pb-16 overflow-hidden border-b border-slate-800/80"
      >
        {/* Radial Ambient Beam */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.25, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          style={{ scale: heroGridScale }}
          className="pointer-events-none absolute top-[-15%] right-[-10%] w-[850px] h-[850px] rounded-full blur-[160px]"
          aria-hidden="true"
        >
          <div className="w-full h-full bg-[#315EFB]" />
        </motion.div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full z-10 flex-1 flex flex-col justify-center">
          <motion.div
            style={{ y: heroHeadlineY, opacity: heroOpacity }}
            className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 pt-4 pb-12"
          >
            {/* Left: Oversized Editorial Typography */}
            <div className="max-w-4xl space-y-6">
              {/* Eyebrow Annotation with Entrance */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-center gap-3"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-blue-300">
                  <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  CENTRAL VIGILANCE PLATFORM
                </span>
                <span className="font-mono text-[11px] text-slate-400 tracking-wider">
                  STATUTORY OVERSIGHT &bull; SESSION 2026&ndash;27
                </span>
              </motion.div>

              {/* Massive Editorial Headline with Staggered Lines */}
              <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[100px] xl:text-[108px] font-black tracking-tighter leading-[0.88] uppercase text-white">
                <motion.span
                  className="block"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  INSTITUTIONAL
                </motion.span>
                <motion.span
                  className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-slate-100"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
                >
                  INTELLIGENCE.
                </motion.span>
                <motion.span
                  className="text-slate-300 text-4xl sm:text-6xl md:text-7xl lg:text-[88px] font-extrabold tracking-tight block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-blue-300 to-[#315EFB]"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
                >
                  ACCOUNTABILITY IN MOTION.
                </motion.span>
              </h1>

              {/* Supporting Editorial Paragraph */}
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.68, ease: [0.16, 1, 0.3, 1] }}
                className="text-base sm:text-lg lg:text-xl leading-relaxed text-slate-300 font-normal max-w-2xl border-l-2 border-[#315EFB] pl-4 sm:pl-6"
              >
                A unified intelligence platform for monitoring institutional grievances, identifying
                overlapping complaints, and supporting transparent, evidence-led administrative decisions.
              </motion.p>

              {/* Directional Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-center gap-4 pt-4"
              >
                <a
                  href="#command-center"
                  className="group inline-flex items-center gap-3 rounded-xl bg-[#315EFB] px-6 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-[0_4px_25px_rgba(49,94,251,0.5)] hover:bg-[#254EDB] transition-all hover:scale-[1.02] active:scale-98"
                >
                  <span>Explore Command Center</span>
                  <IconArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                </a>

                <Link
                  href="/complaints"
                  className="group inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/90 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-200 hover:border-slate-400 hover:text-white transition-all shadow-xs"
                >
                  <span>Review Complaints</span>
                  <IconChevronRight size={15} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              {/* Demo Mode Understated Label */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.95 }}
                className="flex items-center gap-2 pt-2 text-[11px] font-mono text-slate-400"
              >
                <IconCheckCircle size={14} className="text-[#10B981] shrink-0" />
                <span>
                  Demo System Active &bull; In-memory procedural records &bull; Advisory similarity matching
                </span>
              </motion.div>
            </div>

            {/* Right: Layered Live Intelligence Preview Panel with Entrance */}
            <motion.div
              style={{ y: heroPanelY }}
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-full lg:w-[420px] shrink-0 space-y-4"
            >
              <div className="rounded-2xl border border-slate-800 bg-[#0C1424]/95 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#10B981] animate-ping" />
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      LIVE INTAKE TELEMETRY
                    </span>
                  </div>
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                    SYNCED
                  </span>
                </div>

                {/* 4 Metric Tiles */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.55 }}
                    className="rounded-xl border border-slate-800 bg-[#121E36]/60 p-3.5"
                  >
                    <span className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                      Intake Dossiers
                    </span>
                    <span className="mt-1 block text-3xl font-black tabular-nums text-white font-mono">
                      <AnimatedNumber value={totalComplaints} />
                    </span>
                    <span className="text-[10px] text-slate-400">total registered</span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.62 }}
                    className="rounded-xl border border-slate-800 bg-[#121E36]/60 p-3.5"
                  >
                    <span className="block font-mono text-[10px] text-slate-400 uppercase tracking-widest">
                      Active Cases
                    </span>
                    <span className="mt-1 block text-3xl font-black tabular-nums text-blue-400 font-mono">
                      <AnimatedNumber value={activeCount} />
                    </span>
                    <span className="text-[10px] text-slate-400">in scrutiny</span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.69 }}
                    className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-3.5"
                  >
                    <span className="block font-mono text-[10px] text-rose-300 uppercase tracking-widest">
                      Critical Risk
                    </span>
                    <span className="mt-1 block text-3xl font-black tabular-nums text-rose-400 font-mono">
                      <AnimatedNumber value={criticalCount} />
                    </span>
                    <span className="text-[10px] text-rose-300/80">statutory alerts</span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.76 }}
                    className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3.5"
                  >
                    <span className="block font-mono text-[10px] text-amber-300 uppercase tracking-widest">
                      Overlap Queue
                    </span>
                    <span className="mt-1 block text-3xl font-black tabular-nums text-amber-400 font-mono">
                      <AnimatedNumber value={pendingOverlapCount} />
                    </span>
                    <span className="text-[10px] text-amber-300/80">candidate pairs</span>
                  </motion.div>
                </div>

                {/* Compact Status Progression Bar */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.84 }}
                  className="rounded-xl border border-slate-800/80 bg-[#101A2F]/50 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-300">PROGRESSION SPLIT</span>
                    <span className="text-slate-400">{activeCount} active / {statusCounts.resolved} closed</span>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="bg-[#315EFB]"
                      style={{ width: `${Math.round((statusCounts.scrutiny / totalComplaints) * 100)}%` }}
                      title={`Scrutiny: ${statusCounts.scrutiny}`}
                    />
                    <div
                      className="bg-indigo-500"
                      style={{ width: `${Math.round((statusCounts.assigned / totalComplaints) * 100)}%` }}
                      title={`Assigned: ${statusCounts.assigned}`}
                    />
                    <div
                      className="bg-amber-500"
                      style={{ width: `${Math.round((statusCounts.proceedings / totalComplaints) * 100)}%` }}
                      title={`Proceedings: ${statusCounts.proceedings}`}
                    />
                    <div
                      className="bg-rose-500"
                      style={{ width: `${Math.round((statusCounts.escalated / totalComplaints) * 100)}%` }}
                      title={`Escalated: ${statusCounts.escalated}`}
                    />
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${Math.round((statusCounts.resolved / totalComplaints) * 100)}%` }}
                      title={`Resolved: ${statusCounts.resolved}`}
                    />
                  </div>
                </motion.div>

                {/* Urgent Alert Stream Snippet */}
                <div className="space-y-2">
                  <span className="block font-mono text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    PRIORITY SCRUTINY STREAM
                  </span>
                  {urgentCases.slice(0, 2).map((c) => (
                    <Link
                      key={c.id}
                      href={`/complaints/${c.id}`}
                      className="group block rounded-lg border border-slate-800/80 bg-[#0F192C] p-2.5 hover:border-blue-500/40 hover:bg-[#14223B] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-400 group-hover:underline">
                          {c.id}
                        </span>
                        <PriorityBadge priority={c.priority} />
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-200 truncate">
                        {c.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator at Viewport Base */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full z-10 flex items-center justify-between text-xs font-mono text-slate-400 pt-4 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#315EFB]" />
            <span>AICTE CENTRAL GRIEVANCE ENGINE</span>
          </div>
          <a
            href="#monitor"
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors uppercase tracking-widest text-[11px]"
          >
            <span>SCROLL TO COMMENCE INQUIRY</span>
            <IconChevronDown size={14} className="animate-bounce" />
          </a>
        </div>
      </section>

      {/* 3. PRIORITY 2 — STICKY CHOREOGRAPHY: SECTION A (MONITOR) */}
      <section
        id="monitor"
        ref={monitorRef}
        className="relative h-[240vh] bg-[#070B16] border-b border-slate-800/80"
      >
        <div className="sticky top-0 h-screen overflow-hidden flex items-center">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Huge Sticky Numerical Display & Narrative */}
              <motion.div
                style={{
                  scale: monitorBigNumScale,
                  y: monitorBigNumY,
                  opacity: monitorBigNumOpacity,
                }}
                className="lg:col-span-5 space-y-4"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 font-mono text-xs font-bold text-blue-300">
                  <span>01</span>
                  <span>{"//"}</span>
                  <span>UNIFIED GRIEVANCE TELEMETRY</span>
                </div>
                <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase leading-[0.9] text-white">
                  EVERY GRIEVANCE.
                  <br />
                  <span className="text-[#315EFB]">ONE CLEAR VIEW.</span>
                </h2>
                <div className="pt-2">
                  <span className="block font-mono text-5xl sm:text-7xl font-black tabular-nums text-white">
                    {totalComplaints}
                  </span>
                  <span className="block font-mono text-xs text-slate-400 uppercase tracking-widest mt-1">
                    TOTAL DOSSIERS MONITORED ACROSS 5 AICTE APEX CELLS
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-300">
                  Scattered regional portals and individual inboxes are unified into structured digital dossiers with real-time jurisdictional telemetry.
                </p>
                <div className="pt-2">
                  <Link
                    href="/complaints"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#315EFB] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#254EDB] transition-colors shadow-xs"
                  >
                    <span>Browse Complaint Registry</span>
                    <IconArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>

              {/* Right Column: Sliding Complaint Records & Bureau Workload */}
              <div className="lg:col-span-7 space-y-5">
                {/* Cascade Cards entering on scroll */}
                <motion.div
                  style={{ x: monitorCardsX }}
                  className="space-y-3"
                >
                  <span className="block font-mono text-xs font-bold text-slate-400 uppercase tracking-wider">
                    CURRENT INTAKE STREAM (SCROLL-SYNCHRONIZED)
                  </span>
                  {complaints.slice(0, 3).map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-slate-800 bg-[#0F192C]/90 p-4.5 shadow-xl space-y-2 hover:border-blue-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-400">
                            {c.id}
                          </span>
                          <PriorityBadge priority={c.priority} />
                          <StatusBadge status={c.status} />
                        </div>
                        <span className="font-mono text-[11px] text-slate-400">
                          Due: {c.deadlineDate}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-100 line-clamp-1">
                        {c.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <IconBuilding size={12} className="text-slate-400" />
                        <span className="truncate">{c.institutionName}</span>
                        <span>&bull;</span>
                        <span className="text-slate-300 font-medium">{c.bureau}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* Bureau Workload Progress Grid */}
                <motion.div
                  style={{
                    opacity: monitorWorkloadOpacity,
                    y: monitorWorkloadY,
                  }}
                  className="rounded-xl border border-slate-800 bg-[#0E1729]/80 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                    <span>APEX BUREAU WORKLOAD MATRIX</span>
                    <span className="text-blue-400">5 ACTIVE CELLS</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { name: "Approval Bureau", load: 3 },
                      { name: "Anti-Ragging Cell", load: 2 },
                      { name: "Faculty Development Cell", load: 2 },
                      { name: "Student Grievance Cell", load: 2 },
                      { name: "Finance & Legal Cell", load: 1 },
                    ].map((b) => (
                      <div key={b.name} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-200 font-medium">{b.name}</span>
                          <span className="font-mono text-slate-400">{b.load} cases</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#315EFB]"
                            style={{ width: `${(b.load / 3) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRIORITY 2 — STICKY CHOREOGRAPHY: SECTION B (CORRELATE) */}
      <section
        id="correlate"
        ref={correlateRef}
        className="relative h-[260vh] bg-[#050811] border-b border-slate-800/80"
      >
        <div className="sticky top-0 h-screen overflow-hidden flex items-center">
          <motion.div
            style={{ opacity: correlateExitOpacity, y: correlateExitY }}
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-4 sm:py-6"
          >
            <div className="text-center max-w-3xl mx-auto space-y-2 pb-3 sm:pb-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 font-mono text-[11px] font-bold text-indigo-300">
                <span>02</span>
                <span>&bull;</span>
                <span>MULTI-SIGNAL CORRELATION ENGINE</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase leading-[0.92] text-white">
                FIND THE CONNECTIONS
                <br />
                <span className="text-indigo-400">THAT MATTER.</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
                Parallel grievances filed across different channels are correlated across named entities, institutional IDs, and narrative semantics.
              </p>
            </div>

            {/* Asymmetrical Two-Dossier Comparison Workspace */}
            {featuredOverlap && (
              <div className="relative mt-2 sm:mt-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
                  {/* Left Dossier (slides in from left) */}
                  <motion.div
                    style={{ x: dossierLeftX }}
                    className="rounded-xl sm:rounded-2xl border-2 border-blue-500/40 bg-[#0C1527] p-4 sm:p-5 shadow-2xl space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-mono text-xs font-bold text-blue-400">
                          {featuredOverlap.sourceComplaintId}
                        </span>
                        <span className="rounded bg-blue-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-300 uppercase">
                          Source Dossier
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white line-clamp-1 mt-2">
                        {featuredOverlap.source?.title || "Primary Complaint"}
                      </h3>
                      <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                        {featuredOverlap.source?.description}
                      </p>
                    </div>
                    <div className="pt-2 text-[11px] font-mono text-slate-400 flex items-center gap-1.5 border-t border-slate-800/60">
                      <IconBuilding size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{featuredOverlap.source?.institutionName}</span>
                    </div>
                  </motion.div>

                  {/* Right Dossier (slides in from right) */}
                  <motion.div
                    style={{ x: dossierRightX }}
                    className="rounded-xl sm:rounded-2xl border-2 border-indigo-500/40 bg-[#0C1527] p-4 sm:p-5 shadow-2xl space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {featuredOverlap.targetComplaintId}
                        </span>
                        <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300 uppercase">
                          Candidate Match
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white line-clamp-1 mt-2">
                        {featuredOverlap.target?.title || "Correlated Complaint"}
                      </h3>
                      <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                        {featuredOverlap.target?.description}
                      </p>
                    </div>
                    <div className="pt-2 text-[11px] font-mono text-slate-400 flex items-center gap-1.5 border-t border-slate-800/60">
                      <IconBuilding size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{featuredOverlap.target?.institutionName}</span>
                    </div>
                  </motion.div>
                </div>

                {/* Center Animated Connection Beam & Similarity Badge */}
                <div className="mt-3 sm:mt-4 flex flex-col items-center justify-center space-y-2.5">
                  {/* Animated SVG Convergence Line */}
                  <div className="w-full max-w-md h-4 flex items-center justify-center">
                    <svg className="w-full h-3 overflow-visible" aria-hidden="true">
                      <line
                        x1="0"
                        y1="6"
                        x2="100%"
                        y2="6"
                        stroke="#334155"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      <motion.line
                        x1="0"
                        y1="6"
                        x2="100%"
                        y2="6"
                        stroke="#315EFB"
                        strokeWidth="3"
                        style={{ pathLength: connectionLineProgress }}
                      />
                    </svg>
                  </div>

                  {/* Similarity Badge Slam In */}
                  <motion.div
                    style={{
                      scale: similarityScoreScale,
                      opacity: similarityScoreOpacity,
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#315EFB] px-4 py-1.5 sm:px-5 sm:py-2 text-white font-mono font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(49,94,251,0.5)]"
                  >
                    <IconLayers size={15} />
                    <span>{featuredOverlap.signalScore}% CONVERGENCE MATCH</span>
                  </motion.div>

                  {/* Matching Signals Breakdown */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-slate-300">
                    {featuredOverlap.matchingSignals.map((sig) => (
                      <span
                        key={sig.type}
                        className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-slate-200"
                      >
                        <strong className="text-blue-400">{sig.type}:</strong> {sig.detail}
                      </span>
                    ))}
                  </div>

                  {/* Human Oversight Statutory Mandate Banner */}
                  <motion.div
                    style={{
                      y: humanReviewBannerY,
                      opacity: humanReviewBannerOpacity,
                    }}
                    className="w-full max-w-2xl rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 sm:p-3.5 text-center text-xs text-amber-200 space-y-1.5 shadow-lg backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-center gap-2 font-bold text-amber-300 uppercase tracking-wider text-[11px] sm:text-xs">
                      <IconScale size={15} />
                      <span>STATUTORY HUMAN-IN-THE-LOOP MANDATE</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-300 max-w-xl mx-auto">
                      Similarity scores are advisory. Directives to link, consolidate, or dismiss candidate pairs require explicit human adjudication. Records are never automatically merged or deleted.
                    </p>
                    <div className="pt-1">
                      <Link
                        href={`/overlap-review/compare?source=${featuredOverlap.sourceComplaintId}&target=${featuredOverlap.targetComplaintId}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#315EFB] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#254EDB] transition-all shadow-[0_2px_12px_rgba(49,94,251,0.4)] hover:shadow-[0_4px_20px_rgba(49,94,251,0.6)] active:scale-98"
                      >
                        <span>Launch Side-by-Side Adjudication</span>
                        <IconChevronRight size={14} />
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* 5. PRIORITY 2 — STICKY CHOREOGRAPHY: SECTION C (RESOLVE) */}
      <section
        id="resolve"
        ref={resolveRef}
        className="relative h-[240vh] bg-[#070B16] border-b border-slate-800/80"
      >
        <div className="sticky top-0 h-screen overflow-hidden flex items-center">
          <motion.div
            style={{ opacity: resolveContentOpacity, y: resolveEntranceY }}
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-6 sm:py-8"
          >
            <div className="text-center max-w-3xl mx-auto space-y-2 pb-8 sm:pb-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-bold text-emerald-300">
                <span>03</span>
                <span>&bull;</span>
                <span>STATUTORY DUE PROCESS TIMELINE</span>
              </div>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter uppercase leading-[0.9] text-white">
                FROM SCRUTINY TO
                <br />
                <span className="text-emerald-400">ACCOUNTABLE ACTION.</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
                Every grievance adheres to statutory procedural milestones, ending with an immutable tamper-evident audit record.
              </p>
            </div>

            {/* Connecting Timeline SVG & 5 Procedural Milestones */}
            <div className="relative">
              {/* Animated Progress Connecting Line */}
              <div className="hidden md:block absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 z-0 px-8" aria-hidden="true">
                <svg className="w-full h-4 overflow-visible">
                  <line
                    x1="0"
                    y1="8"
                    x2="100%"
                    y2="8"
                    stroke="#1E293B"
                    strokeWidth="3"
                  />
                  <motion.line
                    x1="0"
                    y1="8"
                    x2="100%"
                    y2="8"
                    stroke="#10B981"
                    strokeWidth="4"
                    style={{ pathLength: timelineSvgProgress }}
                  />
                </svg>
              </div>

              {/* 5 Milestone Cards with Sequential Scroll Activation */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-4 relative z-10">
                {[
                  {
                    step: "01",
                    title: "Intake & Scrutiny",
                    desc: "Digital intake verification, jurisdiction validation, and preliminary triage.",
                    status: "Logged",
                    opacity: milestone1Opacity,
                  },
                  {
                    step: "02",
                    title: "Bureau Allocation",
                    desc: "Assignment to specialized apex cell (Anti-Ragging, Approval, Faculty, etc.).",
                    status: "Assigned",
                    opacity: milestone2Opacity,
                  },
                  {
                    step: "03",
                    title: "Show-Cause Notice",
                    desc: "Issuance of formal notice to institution with statutory response window.",
                    status: "Notice Issued",
                    opacity: milestone3Opacity,
                  },
                  {
                    step: "04",
                    title: "Evidentiary Hearing",
                    desc: "Convening of hearing committee, submission of defense, or escalation.",
                    status: "Hearing",
                    opacity: milestone4Opacity,
                  },
                  {
                    step: "05",
                    title: "Final Order & Audit",
                    desc: "Administrative determination logged to immutable tamper-evident trail.",
                    status: "Resolved",
                    opacity: milestone5Opacity,
                  },
                ].map((item) => (
                  <motion.div
                    key={item.step}
                    style={{ opacity: item.opacity }}
                    className="rounded-xl sm:rounded-2xl border border-slate-800 bg-[#0C1424] p-4 sm:p-5 space-y-2 shadow-xl hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-emerald-400">
                        STAGE {item.step}
                      </span>
                      <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] font-mono text-slate-300 uppercase">
                        {item.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white pt-1">{item.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/audit-trail"
                className="inline-flex items-center gap-2 rounded-xl bg-[#315EFB] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#254EDB] transition-all shadow-[0_2px_15px_rgba(49,94,251,0.4)] hover:shadow-[0_4px_25px_rgba(49,94,251,0.6)] active:scale-98"
              >
                <IconScale size={15} />
                <span>Inspect Verified Audit Trail</span>
              </Link>
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <IconBarChart size={15} />
                <span>View Procedural Analytics</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 6. DELIBERATE TRANSITION: WARM EDITORIAL IVORY OPERATIONAL COMMAND CENTER */}
      <section
        id="command-center"
        className="relative z-10 bg-[#F4F0E8] text-[#172033] py-16 sm:py-24 scroll-mt-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Maximalist Ivory Header Banner */}
          <div className="border-b-2 border-[#172033] pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#315EFB]" />
                <span className="font-mono text-xs font-black uppercase tracking-widest text-[#315EFB]">
                  SECTION 04 // CENTRAL OPERATIONAL REPOSITORY
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-[#172033] leading-none">
                YOUR INSTITUTIONAL
                <br />
                COMMAND CENTER.
              </h2>
              <p className="text-xs sm:text-sm font-medium text-[#5A6474] max-w-2xl">
                Direct operational access to active dossiers, statutory deadlines, bureau workloads, and triage queues. Connected in real-time to the central intelligence session.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/complaints"
                className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-xs font-bold text-[#172033] hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <IconFileText size={15} className="text-[#315EFB]" />
                <span>Full Registry ({totalComplaints})</span>
              </Link>
              <Link
                href="/overlap-review"
                className="inline-flex items-center gap-2 rounded-xl bg-[#315EFB] px-4.5 py-2.5 text-xs font-bold text-white hover:bg-[#254EDB] shadow-2xs transition-colors"
              >
                <IconLayers size={15} />
                <span>Triage Queue ({pendingOverlapCount})</span>
              </Link>
            </div>
          </div>

          {/* Real Operational Overview Dashboard Component */}
          <OperationalDashboard />
        </div>
      </section>

      {/* 7. Maximalist Institutional Footer */}
      <footer className="relative z-10 border-t border-slate-800 bg-[#04060E] py-10 text-xs font-mono text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#315EFB] text-white">
              <IconShield size={16} />
            </div>
            <span className="font-bold text-slate-200 uppercase tracking-wider">
              AICTE Apex Institutional Complaint Intelligence Platform
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-wider">
            <Link href="/complaints" className="hover:text-white transition-colors">
              Complaints
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
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-500">CYCLE 2026&ndash;27 &bull; v0.3.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
