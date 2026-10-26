'use client';

import React, { useState, useEffect } from 'react';
import { useComplaints } from '../../lib/context/complaint-context';
import { apiClient } from '../../lib/api-client';
import { IconShield, IconX, IconCheckCircle, IconAlertTriangle } from '../ui/icons';
import { Badge } from '../ui/badge';

export const OfficerLoginModal: React.FC = () => {
  const { isLoginModalOpen, closeLoginModal, currentOfficer, switchOfficer, backendStatus } =
    useComplaints();
  const [badgeNumber, setBadgeNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableOfficers, setAvailableOfficers] = useState<
    Array<{
      id: string;
      badgeNumber: string;
      name: string;
      role: string;
      bureau: { name: string; code: string };
    }>
  >([]);

  useEffect(() => {
    if (isLoginModalOpen && backendStatus === 'connected') {
      apiClient
        .getOfficers()
        .then((list) => {
          setAvailableOfficers(list || []);
        })
        .catch(() => {
          // Ignore if officers route is restricted or offline
        });
    }
  }, [isLoginModalOpen, backendStatus]);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (backendStatus === 'offline') {
      setErrorMessage(
        'Database Offline: The live PostgreSQL server is disconnected. Officer authentication requires an active database session. You can continue testing in local demo mode without signing in.'
      );
      return;
    }
    if (!badgeNumber.trim()) {
      setErrorMessage('Official officer badge number is required.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const success = await switchOfficer(badgeNumber.trim(), email.trim() || undefined);
      if (success) {
        closeLoginModal();
        setBadgeNumber('');
        setEmail('');
      } else {
        setErrorMessage(
          'Officer identity not found or inactive. Verify your AICTE badge number and institutional email.'
        );
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPredefined = (officerBadge: string, officerEmail?: string) => {
    setBadgeNumber(officerBadge);
    if (officerEmail) setEmail(officerEmail);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-[#0E1626] text-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="officer-login-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#315EFB] text-white shadow-[0_0_15px_rgba(49,94,251,0.4)]">
              <IconShield size={20} />
            </div>
            <div>
              <h2 id="officer-login-title" className="text-base font-bold text-white">
                Officer Authentication
              </h2>
              <p className="text-xs text-slate-400">
                AICTE Scrutiny &amp; Bureau Officer Authorization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeLoginModal}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close dialog"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {currentOfficer ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <IconCheckCircle size={16} />
                <span>Currently Signed In</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-white">{currentOfficer.name}</p>
              <p className="text-xs text-slate-300">
                Badge: <span className="font-mono">{currentOfficer.badgeNumber}</span> &bull; Role:{' '}
                {currentOfficer.role}
              </p>
            </div>
          ) : backendStatus === 'offline' ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200">
              <p className="font-semibold text-amber-300 mb-0.5">
                Database Offline (Local Demo Mode)
              </p>
              <p className="text-[11px] leading-relaxed text-amber-200/80">
                The PostgreSQL database is currently disconnected. Live officer cryptographic
                authentication requires database access. You can explore the portal, submit
                complaints, and test overlap detection in local in-memory mode.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3.5 text-xs text-slate-300">
              <p className="font-semibold text-blue-300 mb-0.5">Role-Based Security Invariant</p>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Protected administrative operations (complaint registration and adjudication)
                require verified credentials. Enter your badge number and official institutional
                email below.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label
                htmlFor="badge-number-input"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Badge Number <span className="text-rose-400">*</span>
              </label>
              <input
                id="badge-number-input"
                type="text"
                required
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="e.g. OFF-AICTE-000"
                className="w-full h-10 rounded-lg border border-slate-700 bg-[#090F1B] px-3 text-xs text-white placeholder:text-slate-500 focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/30 font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="officer-email-input"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Institutional Email (Optional)
              </label>
              <input
                id="officer-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. dr.sk.rao@demo.aicte.internal"
                className="w-full h-10 rounded-lg border border-slate-700 bg-[#090F1B] px-3 text-xs text-white placeholder:text-slate-500 focus:border-[#315EFB] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB]/30"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-950/30 text-xs text-rose-300 flex items-start gap-2">
                <IconAlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeLoginModal}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-lg bg-[#315EFB] text-xs font-bold text-white hover:bg-[#254EDB] disabled:opacity-50 transition-colors shadow-md"
              >
                {isLoading ? 'Verifying...' : 'Sign In as Officer'}
              </button>
            </div>
          </form>

          {/* Test Accounts Drawer (Available in Development / Demo) */}
          {availableOfficers.length > 0 && (
            <div className="pt-3 border-t border-slate-800/80">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Available Registered Officers for Testing
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {availableOfficers.map((off) => (
                  <button
                    key={off.id}
                    type="button"
                    onClick={() => handleSelectPredefined(off.badgeNumber)}
                    className="w-full text-left p-2 rounded-lg border border-slate-800 bg-[#090F1B] hover:border-[#315EFB]/50 hover:bg-slate-800/40 transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">{off.name}</span>
                      <span className="block text-[10px] text-slate-400">
                        {off.bureau?.name || 'Central Administration'} &bull; Role: {off.role}
                      </span>
                    </div>
                    <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                      {off.badgeNumber}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
