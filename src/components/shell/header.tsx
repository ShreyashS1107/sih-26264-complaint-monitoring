'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { IconCpu, IconMenu, IconSearch, IconShield, IconX } from '../ui/icons';
import { Badge } from '../ui/badge';
import { useComplaints } from '../../lib/context/complaint-context';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

interface PageMeta {
  title: string;
  subtitle: string;
  breadcrumb: string[];
}

function getPageMeta(pathname: string): PageMeta {
  if (pathname === '/') {
    return {
      title: 'Overview Dashboard',
      subtitle: 'Institutional grievance intake metrics and operational alerts',
      breadcrumb: ['AICTE Intelligence', 'Overview'],
    };
  }
  if (pathname === '/complaints') {
    return {
      title: 'Complaint Registry',
      subtitle: 'Search, filter, and inspect institutional grievance dossiers',
      breadcrumb: ['AICTE Intelligence', 'Complaints'],
    };
  }
  if (pathname.startsWith('/complaints/')) {
    const id = pathname.split('/')[2] || '';
    return {
      title: id ? `Dossier ${id}` : 'Complaint Dossier',
      subtitle: 'Case inspection, evidence review, and administrative action dispatch',
      breadcrumb: ['AICTE Intelligence', 'Complaints', id || 'Detail'],
    };
  }
  if (pathname === '/overlap-review') {
    return {
      title: 'Overlap Review Queue',
      subtitle: 'Multi-signal candidate correlations awaiting human adjudication',
      breadcrumb: ['AICTE Intelligence', 'Overlap Review'],
    };
  }
  if (pathname.startsWith('/overlap-review/compare')) {
    return {
      title: 'Side-by-Side Adjudication',
      subtitle: 'Clause-by-clause case comparison with human verdict recording',
      breadcrumb: ['AICTE Intelligence', 'Overlap Review', 'Compare'],
    };
  }
  if (pathname === '/analytics') {
    return {
      title: 'Analytics & Bureau Trends',
      subtitle: 'Workload distribution, category patterns, and SLA compliance',
      breadcrumb: ['AICTE Intelligence', 'Analytics'],
    };
  }
  if (pathname === '/audit-trail') {
    return {
      title: 'System Audit Trail',
      subtitle: 'Chronological accountability log of administrative actions',
      breadcrumb: ['AICTE Intelligence', 'Audit Trail'],
    };
  }
  if (pathname === '/submit-complaint') {
    return {
      title: 'Submit Grievance for Verification',
      subtitle: 'Record an institutional complaint, attach exhibits, and run overlap analysis',
      breadcrumb: ['AICTE Intelligence', 'Submit Complaint'],
    };
  }
  if (pathname === '/how-it-works') {
    return {
      title: 'System Architecture & Workflow',
      subtitle: 'AICTE SIH26264 methodology, lifecycle, overlap engine & data model',
      breadcrumb: ['AICTE Intelligence', 'How It Works'],
    };
  }

  return {
    title: 'AICTE Portal',
    subtitle: 'Institutional complaint monitoring and tracking',
    breadcrumb: ['AICTE Intelligence'],
  };
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { backendStatus, isLoading, currentOfficer, openLoginModal } = useComplaints();
  const [searchQuery, setSearchQuery] = useState('');
  const meta = getPageMeta(pathname);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/complaints?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[#E5E0D5] bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Left: Mobile menu toggle + Titles/Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-[#697386] hover:bg-slate-100 hover:text-[#172033] lg:hidden focus:outline-hidden focus:ring-2 focus:ring-[#315EFB] transition-colors shrink-0"
          aria-label="Open navigation menu"
        >
          <IconMenu size={20} />
        </button>

        <div className="min-w-0">
          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-1.5 text-[11px] text-[#697386]"
            aria-label="Breadcrumb"
          >
            {meta.breadcrumb.map((crumb, idx) => (
              <React.Fragment key={crumb}>
                {idx > 0 && <span className="text-slate-300">/</span>}
                <span
                  className={
                    idx === meta.breadcrumb.length - 1
                      ? 'font-semibold text-[#172033] truncate'
                      : 'truncate'
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </nav>
          {/* Title and contextual subtitle */}
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-[#172033] leading-none mt-0.5 truncate">
            {meta.title}
          </h1>
        </div>
      </div>

      {/* Right: Search + Quick Actions + User profile */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Restrained Enterprise Search bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dossiers, institutions..."
            className="h-8.5 w-44 lg:w-64 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] pl-8.5 pr-8 text-xs text-[#172033] placeholder:text-[#697386] focus:border-[#315EFB] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/20 transition-all shadow-2xs"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#697386]">
            <IconSearch size={14} />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search input"
            >
              <IconX size={12} />
            </button>
          )}
        </form>

        {/* Submit Complaint Button */}
        <Link
          href="/submit-complaint"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#315EFB] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#254EDB] transition-all shadow-2xs"
        >
          <span>+ Submit Complaint</span>
        </Link>

        {/* How It Works Link */}
        <Link
          href="/how-it-works"
          className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] px-2.5 py-1.5 text-xs font-semibold text-[#172033] hover:border-[#315EFB]/40 hover:bg-[#315EFB]/5 hover:text-[#315EFB] transition-all shadow-2xs"
          title="Explain System Architecture and Methodology"
        >
          <IconCpu size={14} className="text-[#315EFB]" />
          <span>How It Works</span>
        </Link>

        {/* Live Backend / Demo environment pill */}
        {isLoading ? (
          <Badge
            variant="neutral"
            size="sm"
            className="hidden sm:inline-flex gap-1.5 items-center font-medium shadow-2xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
            <span>Syncing API...</span>
          </Badge>
        ) : backendStatus === 'connected' ? (
          <Badge
            variant="success"
            size="sm"
            className="hidden sm:inline-flex gap-1.5 items-center font-medium shadow-2xs"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>API Live</span>
          </Badge>
        ) : (
          <Badge
            variant="warning"
            size="sm"
            className="hidden sm:inline-flex gap-1.5 items-center font-medium shadow-2xs"
            title="PostgreSQL database offline — operating on seed data"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>DB Offline (Seed Data)</span>
          </Badge>
        )}

        {/* User Identity Chip / Officer Sign-In */}
        <button
          type="button"
          onClick={openLoginModal}
          className="flex items-center gap-2.5 pl-1.5 sm:pl-3 border-l border-[#E5E7EB] hover:opacity-85 transition-opacity text-left cursor-pointer group"
          title={
            currentOfficer
              ? 'Click to switch or verify officer account'
              : 'Click to sign in with an officer account'
          }
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#315EFB]/10 border border-[#315EFB]/20 text-[#315EFB] group-hover:bg-[#315EFB]/15 transition-colors shrink-0">
            <IconShield size={16} />
          </div>
          <div className="hidden xl:block text-left">
            <span className="block text-xs font-bold text-[#172033] leading-none group-hover:text-[#315EFB] transition-colors">
              {currentOfficer ? currentOfficer.name : 'Officer Sign In'}
            </span>
            <span className="block text-[10px] font-medium text-[#697386] leading-none mt-1">
              {currentOfficer
                ? currentOfficer.bureau?.name ||
                  (currentOfficer.role === 'CENTRAL_ADMIN'
                    ? 'Central Administration'
                    : 'Apex Scrutiny Cell')
                : 'Guest / Scrutiny View'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
