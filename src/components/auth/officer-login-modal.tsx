'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useComplaints } from '../../lib/context/complaint-context';
import {
  IconShield,
  IconX,
  IconCheckCircle,
  IconSparkles,
  IconArrowRight,
} from '../ui/icons';
import { Badge } from '../ui/badge';

const SAMPLE_OFFICERS = [
  { badge: 'OFF-AICTE-001', name: 'Dr. S. K. Rao', bureau: 'Approval Bureau', role: 'CASE_OFFICER' },
  { badge: 'OFF-AICTE-002', name: 'Inspector Alpha', bureau: 'Anti-Ragging Cell', role: 'CASE_OFFICER' },
  { badge: 'OFF-AICTE-003', name: 'Prof. M. Iyer', bureau: 'Faculty Development', role: 'CASE_OFFICER' },
  { badge: 'OFF-AICTE-000', name: 'Director General', bureau: 'Central Administration', role: 'CENTRAL_ADMIN' },
];

export const OfficerLoginModal: React.FC = () => {
  const router = useRouter();
  const { isLoginModalOpen, closeLoginModal, switchOfficer, currentOfficer } = useComplaints();
  const [badgeNumber, setBadgeNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoginModalOpen) {
    return null;
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      await switchOfficer(badgeNumber, email);
      closeLoginModal();
      router.push('/dashboard');
    } catch {
      closeLoginModal();
      router.push('/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPredefined = (badge: string) => {
    setBadgeNumber(badge);
    setEmail(`${badge.toLowerCase()}@demo.aicte.internal`);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="officer-login-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
          onClick={closeLoginModal}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-2xl backdrop-blur-2xl"
          style={{
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6), 0 0 35px -5px var(--primary-accent-glow)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-[0_0_15px_var(--primary-accent-glow)]"
                style={{ backgroundColor: 'var(--primary-accent)' }}
              >
                <IconShield size={20} />
              </div>
              <div>
                <h2 id="officer-login-title" className="text-base font-bold text-[var(--text-primary)]">
                  Officer Authentication
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  AICTE Scrutiny &amp; Bureau Authorization
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeLoginModal}
              className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Close dialog"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="pt-4 space-y-4">
            {/* Active Session Pill if already signed in */}
            {currentOfficer && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <IconCheckCircle size={15} />
                  <span>Currently Signed In</span>
                </div>
                <p className="mt-1 font-semibold text-white">{currentOfficer.name}</p>
                <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                  Badge: {currentOfficer.badgeNumber} &bull; Role: {currentOfficer.role}
                </p>
              </div>
            )}

            {/* Frictionless Demo Notice */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--primary-accent-subtle)] p-3 text-xs text-[var(--text-primary)] flex items-start gap-2.5">
              <IconSparkles size={16} className="text-[var(--primary-accent)] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Prototype Demo Login</span>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  You can click &ldquo;Enter Portal (Demo Login)&rdquo; directly without filling any fields to access the dashboard.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="modal-badge-input"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
                >
                  Badge Number (Optional)
                </label>
                <input
                  id="modal-badge-input"
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="Enter AICTE ID"
                  className="w-full h-9.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-accent)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="modal-email-input"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
                >
                  Institutional Email (Optional)
                </label>
                <input
                  id="modal-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter institutional email (optional)"
                  className="w-full h-9.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-accent)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeLoginModal}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4.5 py-2 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-md active:scale-98"
                  style={{
                    backgroundColor: 'var(--primary-accent)',
                    boxShadow: '0 2px 12px var(--primary-accent-glow)',
                  }}
                >
                  <span>{isSubmitting ? 'Entering...' : 'Enter Portal (Demo Login)'}</span>
                  <IconArrowRight size={14} />
                </button>
              </div>
            </form>

            {/* Quick Select Sample Officers */}
            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                Quick Fill Sample Officers
              </span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {SAMPLE_OFFICERS.map((off) => (
                  <button
                    key={off.badge}
                    type="button"
                    onClick={() => handleSelectPredefined(off.badge)}
                    className="w-full text-left p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] hover:border-[var(--primary-accent)] transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[var(--text-primary)]">{off.name}</span>
                      <span className="block text-[10px] text-[var(--text-secondary)]">
                        {off.bureau} &bull; {off.role}
                      </span>
                    </div>
                    <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                      {off.badge}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
