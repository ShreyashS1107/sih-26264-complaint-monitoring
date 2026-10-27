import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../lib/context/theme-context";
import { ComplaintProvider } from "../lib/context/complaint-context";
import { AppShell } from "../components/shell/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AICTE Institutional Complaint Intelligence",
  description: "AICTE Apex Institutional Complaint Monitoring, Overlap Triage & Tracking System",
};

const themeInitScript = `
  (function() {
    try {
      var mode = localStorage.getItem('sih26264_theme_mode') || 'dark';
      var accent = localStorage.getItem('sih26264_theme_accent') || 'blue';
      var customColor = localStorage.getItem('sih26264_theme_custom_color');
      document.documentElement.setAttribute('data-theme', mode);
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
      document.documentElement.setAttribute('data-accent', accent);
      if (accent === 'custom' && customColor) {
        document.documentElement.style.setProperty('--primary-accent', customColor);
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
        <ThemeProvider>
          <ComplaintProvider>
            <AppShell>{children}</AppShell>
          </ComplaintProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

