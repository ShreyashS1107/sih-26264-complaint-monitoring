'use client';

import React, { useState, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { ApiStatusModal } from '../ui/api-status-modal';

import { OfficerLoginModal } from '../auth/officer-login-modal';

interface AppShellProps {
  children: React.ReactNode;
}

function ShellLayout({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Standalone pages (landing, login, and architecture explainer)
  if (pathname === '/' || pathname === '/how-it-works' || pathname === '/login') {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased selection:bg-[var(--primary-accent)]/30 selection:text-white transition-colors duration-200">
        <ApiStatusModal />
        <OfficerLoginModal />
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] antialiased selection:bg-[var(--primary-accent)]/30 selection:text-white transition-colors duration-200">
      <ApiStatusModal />
      <OfficerLoginModal />
      {/* Sidebar Navigation */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Layout */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div>
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
