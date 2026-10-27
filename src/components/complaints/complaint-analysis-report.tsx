'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  IconCheckCircle,
  IconAlertTriangle,
  IconFileText,
  IconScale,
  IconArrowRight,
  IconChevronRight,
  IconInfo,
} from '../ui/icons';
import { StatusBadge, PriorityBadge, Badge } from '../ui/badge';
import { ComplaintSubmissionResult } from '../../lib/types';
import { fadeInUpVariants, staggerContainerVariants } from '../../lib/motion';

interface ComplaintAnalysisReportProps {
  result: ComplaintSubmissionResult;
  onReset?: () => void;
}

export const ComplaintAnalysisReport: React.FC<ComplaintAnalysisReportProps> = ({
  result,
  onReset,
}) => {
  const { complaint, overlaps, mode, evaluatedPoolSize, detectedCandidateCount } = result;

  // Determine top overlap candidate if any
  const topCandidate = overlaps && overlaps.length > 0 ? overlaps[0] : null;

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto space-y-6 text-[var(--text-primary)] transition-colors"
    >
      {/* 1. Header Banner & Environment Provenance (Requirement 5) */}
      <motion.div
        variants={fadeInUpVariants}
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--primary-accent)] bg-[var(--primary-accent-subtle)] border border-[var(--primary-accent)]/30 px-2.5 py-0.5 rounded-md">
                VERIFICATION REPORT
              </span>
              {mode === 'live-backend' ? (
                <Badge variant="success" size="sm" className="font-medium gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Recorded in Live PostgreSQL Registry</span>
                </Badge>
              ) : (
                <Badge
                  variant="warning"
                  size="sm"
                  className="font-medium gap-1.5"
                  title="Operating with local in-memory fixtures while PostgreSQL database is disconnected"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Local In-Memory Evaluation (Offline Demo Mode)</span>
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)] mt-2">
              Institutional Grievance Scrutiny Report
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Case Reference: <strong className="font-mono text-[var(--text-primary)]">{complaint.id}</strong>{' '}
              &bull; Filed on {complaint.filingDate}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="px-3.5 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--primary-accent)] transition-colors shadow-2xs"
              >
                Submit Another Grievance
              </button>
            )}
            <Link
              href={`/complaints/${complaint.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary-accent)] text-xs font-bold text-white hover:bg-[var(--primary-accent-hover)] transition-colors shadow-2xs shadow-[0_0_12px_var(--primary-accent-glow)]"
            >
              <span>Inspect Full Dossier</span>
              <IconChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Institution & Bureau Metadata Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="block text-[11px] font-semibold text-[var(--text-muted)]">
              Affiliated Institution
            </span>
            <span
              className="font-bold text-[var(--text-primary)] block truncate"
              title={complaint.institutionName}
            >
              {complaint.institutionName}
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              ID: {complaint.institutionId}
            </span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-[var(--text-muted)]">
              Originating Bureau
            </span>
            <span className="font-bold text-[var(--text-primary)] block">{complaint.bureau}</span>
            <span className="text-[10px] text-[var(--text-muted)]">{complaint.category}</span>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-[var(--text-muted)]">
              Priority &amp; Status
            </span>
            <div className="flex items-center gap-2 mt-1">
              <PriorityBadge priority={complaint.priority} />
              <StatusBadge status={complaint.status} />
            </div>
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-[var(--text-muted)]">Complainant Type</span>
            <span className="font-bold text-[var(--text-primary)] block">{complaint.complainantType}</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              Target Deadline: {complaint.deadlineDate}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Primary Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Information That Matches Across Sources */}
        <motion.div
          variants={fadeInUpVariants}
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <IconCheckCircle size={17} />
              </div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Information That Matches Across Sources
              </h2>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              {detectedCandidateCount} Correlated Source{detectedCandidateCount === 1 ? '' : 's'}
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The verification engine evaluated this grievance against {evaluatedPoolSize} active
            institutional records across AICTE bureaus.
          </p>

          <div className="space-y-3">
            {/* Institution canonical check */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs space-y-1">
              <span className="font-bold text-emerald-400 block">
                &bull; Verified AICTE Canonical Institution Match
              </span>
              <p className="text-[var(--text-secondary)] text-[11px]">
                Submission matched canonical institution identity{' '}
                <strong className="text-[var(--text-primary)]">{complaint.institutionName}</strong> with AICTE
                Permanent ID{' '}
                <span className="font-mono text-[var(--text-primary)]">{complaint.institutionId}</span> located
                in {complaint.region}, {complaint.state}.
              </p>
            </div>

            {/* Overlap candidate matching signals */}
            {overlaps.length === 0 ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
                <IconInfo size={20} className="mx-auto text-[var(--primary-accent)] mb-1" />
                <span className="font-bold text-[var(--text-primary)] block">
                  No Overlapping Cases Detected
                </span>
                <p className="text-[11px] mt-0.5">
                  No previous complaints from other bureaus met the threshold for thematic or
                  coordinated similarity. This appears to be an independent filing.
                </p>
              </div>
            ) : (
              overlaps.map((cand, idx) => (
                <div
                  key={cand.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3.5 space-y-2 hover:border-[var(--primary-accent)]/50 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      Candidate #{idx + 1}: Pair with {cand.targetComplaintId}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)] font-bold px-2 py-0.5 text-[10px] border border-[var(--primary-accent)]/30">
                      {cand.signalScore}% Signal Score
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    {cand.matchingSignals.map((sig, sIdx) => (
                      <div key={sIdx} className="text-[var(--text-secondary)]">
                        <strong className="text-[var(--text-primary)]">{sig.type}:</strong> {sig.detail}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)] italic">Advisory candidate match</span>
                    <Link
                      href={`/overlap-review/compare?source=${cand.sourceComplaintId}&target=${cand.targetComplaintId}`}
                      className="font-bold text-[var(--primary-accent)] hover:text-[var(--primary-accent-hover)] inline-flex items-center gap-1"
                    >
                      <span>Side-by-Side Comparison</span>
                      <IconChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Section 2: Differences Found & Discrepancies Requiring Attention */}
        <motion.div
          variants={fadeInUpVariants}
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <IconAlertTriangle size={17} />
              </div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Differences Found &amp; Items Requiring Attention
              </h2>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
              Human Review Needed
            </span>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The verification engine highlights divergent claims, procedural timing gaps, or
            multi-portal filings so officers can investigate without bias.
          </p>

          <div className="space-y-3">
            {/* Formal Allegations Breakdown */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3.5 space-y-2">
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                Recorded Grievance Narrative &amp; Specific Allegations
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3 bg-[var(--bg-surface)] p-2.5 rounded-lg border border-[var(--border-subtle)]">
                &ldquo;{complaint.description}&rdquo;
              </p>
              <ul className="space-y-1 text-xs">
                {complaint.allegations.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[var(--text-primary)]">
                    <span className="font-mono text-[10px] font-bold text-[var(--primary-accent)] mt-0.5">
                      [{idx + 1}]
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Discrepancy details */}
            {overlaps.length > 0 && topCandidate ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-400">
                  <IconAlertTriangle size={14} className="text-amber-400" />
                  <span>Cross-Bureau Correlation Advisory</span>
                </div>
                <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
                  This case shares thematic keywords with previously registered case{' '}
                  <strong className="text-[var(--text-primary)]">{topCandidate.targetComplaintId}</strong>.
                  Scrutinizers should verify whether this represents parallel filings by multiple
                  students or coordinated representation.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">
                  No Discrepancies with Other Bureaus:
                </span>{' '}
                This case does not conflict with active inquiries in other cells. Standard bureau
                assignment is indicated.
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* 3. Section 3: Supporting Evidence & References (Requirement 8) */}
      <motion.div
        variants={fadeInUpVariants}
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm space-y-3"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)]">
              <IconFileText size={17} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Supporting Evidence &amp; Attached Exhibits
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Verifiable documents submitted in support of this institutional grievance
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
            {complaint.evidence.length} File{complaint.evidence.length === 1 ? '' : 's'} Logged
          </span>
        </div>

        {/* Explicit Disclosure on File Storage (Requirement 8) */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3 text-xs text-[var(--text-secondary)] flex items-start gap-2.5">
          <IconInfo size={16} className="text-[var(--primary-accent)] shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="text-[var(--text-primary)]">Notice on Document Storage:</strong> Document
            metadata, checksums, and exhibit logs are permanently attributed to this dossier record.
            Dedicated cloud binary blob storage (S3/MinIO) is not configured in this deployment
            environment; original digital PDFs and certified physical copies must be preserved in
            the bureau case file.
          </p>
        </div>

        {complaint.evidence.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--text-muted)]">
            No evidentiary documents were attached with this submission. Supporting affidavits may
            be added during inquiry.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {complaint.evidence.map((file) => (
              <div key={file.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)]">
                    <IconFileText size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--text-primary)] block">{file.name}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {file.category} &bull; {file.fileSize} &bull; Uploaded {file.uploadDate}
                    </span>
                  </div>
                </div>
                <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                  Exhibit Logged
                </Badge>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* 4. Section 4: Review Status & Recommended Next Steps (Requirement 7) */}
      <motion.div
        variants={fadeInUpVariants}
        className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-accent-subtle)] text-[var(--primary-accent)]">
            <IconScale size={17} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Review Status &amp; Recommended Next Steps
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Procedural disposition generated by the advisory overlap engine
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-4 space-y-1.5">
            <span className="font-bold text-[var(--text-primary)] block">Current Procedural Status</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={complaint.status} />
              <span className="text-[11px] text-[var(--text-secondary)]">
                Awaiting official scrutinizer assignment
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
              This case has been registered into the AICTE queue and assigned tracking reference{' '}
              <span className="font-mono font-bold text-[var(--text-primary)]">{complaint.id}</span>.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--primary-accent)]/30 bg-[var(--primary-accent-subtle)] p-4 space-y-1.5">
            <span className="font-bold text-[var(--text-primary)] block">Recommended Scrutiny Pathway</span>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {overlaps.length > 0
                ? 'Flag for Joint Bureau Review: Because overlapping issues were detected in another bureau, recommend notifying both case officers before issuing individual show-cause notices.'
                : 'Standard Single-Bureau Scrutiny: Assign to designated bureau case officer for preliminary documentary verification under AICTE Approval Process Handbook (APH) guidelines.'}
            </p>
          </div>
        </div>

        {/* Mandatory Statutory Advisory Callout (Requirement 7) */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-start gap-3">
          <IconAlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-400">Important Council Advisory Note</p>
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              Algorithmic overlap scores and detected discrepancies are automated advisory
              indicators created solely to assist human officers with case coordination. An
              allegation, textual overlap, or data discrepancy{' '}
              <strong>
                does not constitute proof of fraud, malpractice, or document inauthenticity
              </strong>
              . Final determinations rest entirely with designated Scrutiny Officers in accordance
              with natural justice and official AICTE inquiry rules.
            </p>
          </div>
        </div>
      </motion.div>

      {/* 5. Footer Route Actions */}
      <motion.div
        variants={fadeInUpVariants}
        className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <Link
          href="/"
          className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors shadow-2xs"
        >
          &larr; Return to Homepage
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/complaints"
            className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors shadow-2xs"
          >
            Open Complaint Registry
          </Link>
          <Link
            href={`/complaints/${complaint.id}`}
            className="px-5 py-2 rounded-lg bg-[var(--primary-accent)] font-bold text-white hover:bg-[var(--primary-accent-hover)] transition-colors shadow-2xs inline-flex items-center gap-1.5 shadow-[0_0_12px_var(--primary-accent-glow)]"
          >
            <span>Proceed to Dossier</span>
            <IconArrowRight size={13} />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
};
