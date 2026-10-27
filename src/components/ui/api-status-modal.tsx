"use client";

import React from "react";
import { useComplaints } from "../../lib/context/complaint-context";
import { IconShield, IconX } from "./icons";

export const ApiStatusModal: React.FC = () => {
  const { actionError, clearActionError } = useComplaints();

  if (!actionError) return null;

  const isAuthError = actionError.status === 401 || actionError.code === "UNAUTHORIZED";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-error-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                isAuthError
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-500"
              }`}
            >
              <IconShield size={20} />
            </div>
            <div>
              <h2 id="api-error-dialog-title" className="text-base font-bold text-[var(--text-primary)] leading-tight">
                {actionError.title}
              </h2>
              <span className="inline-block mt-0.5 text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                HTTP {actionError.status} &bull; {actionError.code}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={clearActionError}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
            aria-label="Dismiss error modal"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Target Endpoint Tag */}
        <div className="rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] px-3 py-2 font-mono text-xs text-[var(--text-secondary)] break-all">
          <span className="text-[var(--text-muted)] select-none mr-2">Endpoint:</span>
          {actionError.endpoint}
        </div>

        {/* Message */}
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-2">
          <p>{actionError.message}</p>
          {isAuthError && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-600 dark:text-amber-400 leading-normal">
              <strong>Security Protocol Notice:</strong>
              <p className="mt-1">
                The AICTE backend enforces a strict fail-closed policy. To prevent administrative forgery, client-side HTTP headers (such as badge headers) are never trusted. Mutations require a validated server session from an integrated identity provider (e.g. NextAuth or AICTE Keycloak SSO).
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={clearActionError}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-white bg-[var(--primary-accent)] hover:opacity-90 focus:outline-hidden focus:ring-2 focus:ring-[var(--primary-accent)] transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
