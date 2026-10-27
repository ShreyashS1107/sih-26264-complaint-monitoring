'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useComplaints } from '../../lib/context/complaint-context';
import {
  IconShield,
  IconKey,
  IconArrowRight,
  IconCheckCircle,
  IconSparkles,
} from '../../components/ui/icons';
import { Badge } from '../../components/ui/badge';
import { ThemeCustomizer } from '../../components/ui/theme-customizer';

const SAMPLE_OFFICERS = [
  { badge: 'OFF-AICTE-001', name: 'Dr. S. K. Rao', bureau: 'Approval Bureau', role: 'CASE_OFFICER' },
  { badge: 'OFF-AICTE-002', name: 'Inspector Alpha', bureau: 'Anti-Ragging Cell', role: 'CASE_OFFICER' },
  { badge: 'OFF-AICTE-003', name: 'Prof. M. Iyer', bureau: 'Faculty Development', role: 'CASE_OFFICER' },
  { badge: 'OFF-AICTE-000', name: 'Director General', bureau: 'Central Administration', role: 'CENTRAL_ADMIN' },
];

export default function LoginPage() {
  const router = useRouter();
  const { switchOfficer, currentOfficer } = useComplaints();
  const [badgeNumber, setBadgeNumber] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      // Frictionless demo login: succeeds with empty fields or custom credentials
      await switchOfficer(badgeNumber, email);
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSample = (badge: string) => {
    setBadgeNumber(badge);
    setEmail(`${badge.toLowerCase()}@demo.aicte.internal`);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Background Cyber Grid & Radial Accents */}
      <div className="pointer-events-none absolute inset-0 cyber-grid-bg opacity-70" />
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full blur-3xl opacity-25 transition-colors"
        style={{ backgroundColor: 'var(--primary-accent)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full blur-3xl opacity-20 transition-colors"
        style={{ backgroundColor: 'var(--primary-accent)' }}
      />

      {/* Top Controls Bar */}
      <header className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between z-20">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg p-1.5 focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]"
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-[0_0_12px_var(--primary-accent-glow)]"
            style={{ backgroundColor: 'var(--primary-accent)' }}
          >
            <IconShield size={18} />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight text-[var(--text-primary)]">
            AICTE Apex Intelligence
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeCustomizer compact />
        </div>
      </header>

      {/* Main Glassmorphic Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)]/90 backdrop-blur-2xl p-6 sm:p-8 md:p-10 shadow-2xl transition-all"
        style={{
          boxShadow: '0 20px 50px -15px rgba(0,0,0,0.5), 0 0 35px -5px var(--primary-accent-glow)',
        }}
      >
        {/* Card Header */}
        <div className="text-center space-y-2 pb-6 border-b border-[var(--border-subtle)]">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--primary-accent)' }}
            />
            <span className="text-[var(--text-secondary)] font-mono uppercase tracking-wider">
              Prototype Demonstration Gate
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Officer Portal Authentication
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
            AICTE Scrutiny &amp; Bureau Officer Authorization &bull; Academic Cycle 2026&ndash;27
          </p>
        </div>

        {/* Demo Mode Notice Banner */}
        <div className="my-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--primary-accent-subtle)] p-3.5 text-xs text-[var(--text-primary)] flex items-start gap-3">
          <IconSparkles size={18} className="text-[var(--primary-accent)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>Frictionless Demo Login</span>
              <Badge variant="warning" size="sm" className="font-mono text-[9px] uppercase">
                Demo
              </Badge>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              No credentials required. You may leave all fields completely empty and click{' '}
              <strong className="text-[var(--text-primary)] font-semibold">
                &ldquo;Enter Portal (Demo Login)&rdquo;
              </strong>{' '}
              to enter the dashboard immediately.
            </p>
          </div>
        </div>

        {/* Current Session Banner if logged in */}
        {currentOfficer && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconCheckCircle size={16} className="text-emerald-400" />
              <span>
                Active Session: <strong>{currentOfficer.name}</strong> ({currentOfficer.badgeNumber})
              </span>
            </div>
            <Link
              href="/dashboard"
              className="text-[11px] underline font-bold hover:text-emerald-200"
            >
              Go to Dashboard &rarr;
            </Link>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="badge-input"
              className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
            >
              Badge Number / Officer ID (Optional)
            </label>
            <input
              id="badge-input"
              type="text"
              value={badgeNumber}
              onChange={(e) => setBadgeNumber(e.target.value)}
              placeholder="Enter AICTE ID"
              className="w-full h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-accent)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
            >
              Institutional Email (Optional)
            </label>
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter institutional email (optional)"
              className="w-full h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-accent)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="passcode-input"
              className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
            >
              PIN / One-Time Passcode (Optional)
            </label>
            <div className="relative">
              <input
                id="passcode-input"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter password (optional)"
                className="w-full h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] pl-3 pr-9 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary-accent)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)]/20 transition-all"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)]">
                <IconKey size={14} />
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)] active:scale-[0.99] disabled:opacity-50"
              style={{
                backgroundColor: 'var(--primary-accent)',
                boxShadow: '0 4px 18px -2px var(--primary-accent-glow)',
              }}
            >
              <span>{isSubmitting ? 'Entering Portal...' : 'Enter Portal (Demo Login)'}</span>
              <IconArrowRight size={16} />
            </button>
          </div>
        </form>

        {/* Sample Accounts for Quick Demo Testing */}
        <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
            Quick Fill Sample Officer Identity (Optional)
          </span>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLE_OFFICERS.map((off) => (
              <button
                key={off.badge}
                type="button"
                onClick={() => handleSelectSample(off.badge)}
                className="text-left p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] hover:border-[var(--primary-accent)] hover:bg-[var(--primary-accent-subtle)] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-[var(--text-primary)] truncate">
                    {off.name}
                  </span>
                  <span className="text-[9px] font-mono text-[var(--text-muted)]">{off.badge}</span>
                </div>
                <span className="block text-[10px] text-[var(--text-secondary)] truncate">
                  {off.bureau}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Guest direct link */}
        <div className="mt-5 text-center">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary-accent)] transition-colors inline-flex items-center gap-1"
          >
            <span>Proceed to Dashboard without session &rarr;</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
