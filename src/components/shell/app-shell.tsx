"use client";

import React, { useState, Suspense } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ApiStatusModal } from "../ui/api-status-modal";

interface AppShellProps {
  children: React.ReactNode;
}

function ShellLayout({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // The homepage has its own cinematic presentation without the standard dashboard sidebar and header
  if (pathname === "/") {
    return (
      <div className="min-h-screen bg-[#080D18] text-slate-100 antialiased selection:bg-[#315EFB]/30 selection:text-white">
        <ApiStatusModal />
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F7F5F0] text-[#0F172A] antialiased selection:bg-[#315EFB]/20 selection:text-[#050811]">
      <ApiStatusModal />
      {/* Sidebar Navigation */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Layout */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080D18]" />}>
      <ShellLayout>{children}</ShellLayout>
    </Suspense>
  );
};

