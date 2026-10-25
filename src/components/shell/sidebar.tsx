"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  IconDashboard,
  IconFileText,
  IconLayers,
  IconBarChart,
  IconScale,
  IconShield,
  IconX,
} from "../ui/icons";
import { useComplaints } from "../../lib/context/complaint-context";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.FC<{ className?: string; size?: number | string }>;
  badge?: "overlaps" | "critical";
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/", icon: IconDashboard },
  { name: "Complaints", href: "/complaints", icon: IconFileText },
  { name: "Overlap Review", href: "/overlap-review", icon: IconLayers, badge: "overlaps" },
  { name: "Analytics", href: "/analytics", icon: IconBarChart },
  { name: "Audit Trail", href: "/audit-trail", icon: IconScale },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { pendingOverlapCount } = useComplaints();

  const isRouteActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-[#0E1626] border-r border-slate-800/80 text-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 px-5">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-2.5 focus:outline-hidden focus:ring-2 focus:ring-[#315EFB] rounded-lg p-1 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#315EFB] text-white shadow-[0_0_12px_rgba(49,94,251,0.4)]">
              <IconShield size={18} />
            </div>
            <div>
              <span className="block text-sm font-bold tracking-tight text-white leading-tight">
                AICTE Intelligence
              </span>
              <span className="block text-[11px] font-medium tracking-wide text-slate-400">
                Institutional Grievance Portal
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden focus:outline-hidden focus:ring-2 focus:ring-white transition-colors"
            aria-label="Close sidebar"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3.5 py-4" aria-label="Main Navigation">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operations &amp; Triage
          </div>
          {NAV_ITEMS.map((item) => {
            const active = isRouteActive(item.href);
            const Icon = item.icon;
            const badgeCount = item.badge === "overlaps" ? pendingOverlapCount : null;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all focus:outline-hidden focus:ring-2 focus:ring-[#315EFB] ${
                  active
                    ? "bg-[#18243C] text-white font-semibold shadow-xs"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {/* Active Indicator Accent */}
                {active && (
                  <motion.span
                    layoutId="activeNavIndicator"
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#315EFB]"
                    transition={{ duration: 0.2 }}
                  />
                )}

                <div className="flex items-center gap-3">
                  <Icon
                    size={17}
                    className={active ? "text-[#315EFB]" : "text-slate-400 group-hover:text-slate-200 transition-colors"}
                  />
                  <span>{item.name}</span>
                </div>

                {badgeCount !== null && badgeCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Institutional status footer */}
        <div className="border-t border-slate-800/80 p-3.5">
          <div className="rounded-xl bg-[#090F1B] border border-slate-800/80 p-3 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
              <span className="text-[11px] font-semibold text-slate-200">Demo Environment</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              In-memory procedural state. Algorithmic overlap scores are advisory.
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Apex Scrutiny Cell</span>
              <span className="font-mono text-slate-400">v0.2.0</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
