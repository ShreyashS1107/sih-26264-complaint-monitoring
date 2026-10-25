import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F6F7F9]">
        <ComplaintProvider>
          <AppShell>{children}</AppShell>
        </ComplaintProvider>
      </body>
    </html>
  );
}

