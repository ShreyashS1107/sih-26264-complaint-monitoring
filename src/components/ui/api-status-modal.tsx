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
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-[#E5E0D5] p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                isAuthError
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              <IconShield size={20} />
            </div>
            <div>
              <h2 id="api-error-dialog-title" className="text-base font-bold text-[#050811] leading-tight">
                {actionError.title}
              </h2>
              <span className="inline-block mt-0.5 text-[11px] font-mono uppercase tracking-wider text-[#697386]">
                HTTP {actionError.status} &bull; {actionError.code}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={clearActionError}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Dismiss error modal"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Target Endpoint Tag */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-xs text-slate-700 break-all">
          <span className="text-slate-400 select-none mr-2">Endpoint:</span>
          {actionError.endpoint}
        </div>

        {/* Message */}
        <div className="text-xs text-[#2D3748] leading-relaxed space-y-2">
          <p>{actionError.message}</p>
          {isAuthError && (
            <div className="rounded-lg bg-amber-50/80 border border-amber-200/80 p-3 text-[11px] text-amber-900 leading-normal">
              <strong>Security Protocol Notice:</strong>
              <p className="mt-1">
                The AICTE backend enforces a strict fail-closed policy. To prevent administrative forgery, client-side HTTP headers (such as badge headers) are never trusted. Mutations require a validated server session from an integrated identity provider (e.g. NextAuth or AICTE Keycloak SSO).
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={clearActionError}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-white bg-[#050811] hover:bg-[#172033] focus:outline-hidden focus:ring-2 focus:ring-[#315EFB] transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
