/**
 * Root Layout — Next.js App Router Layout
 *
 * Sets up:
 *   - Geist Sans + Geist Mono + Inter fonts
 *   - Global metadata
 *   - An inline <script> that reads localStorage before first paint
 *     to apply the 'dark' class immediately — preventing FOUC (flash of wrong theme).
 *   - The Sonner <Toaster> for global toast notifications.
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import AppShell from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Form Builder",
  description: "A dynamic form builder for creating, publishing, and collecting responses from powerful custom forms.",
};

/**
 * Inline script that runs synchronously before the page renders.
 * Reads 'theme' from localStorage and applies the 'dark' class to <html>
 * so there is never a flash of the wrong colour scheme.
 * Uses dangerouslySetInnerHTML to embed raw JS — this is the standard
 * Next.js / Tailwind pattern for no-FOUC dark mode.
 */
function ThemeInitScript() {
  const script = `
    (function() {
      try {
        var t = localStorage.getItem('theme');
        if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
        }
      } catch(e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeInitScript />
        <AppShell>
          {children}
        </AppShell>
        {/* Global toast container — position top-center with rich colour variants */}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
