import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meera's Fund Tracker",
  description: "Plain-language weekly mutual fund report with benchmark and market context.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-card">
          {/* Phones: title on its own line, links in one row below. sm and up: the original single row. */}
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-3 text-sm">
            <a href="/" className="w-full font-semibold tracking-tight sm:mr-auto sm:w-auto">Meera&apos;s Fund Tracker</a>
            <div className="flex flex-wrap gap-x-4 gap-y-1 whitespace-nowrap sm:contents">
              <a href="/" className="text-muted hover:text-ink">Report</a>
              <a href="/history" className="text-muted hover:text-ink">Trends</a>
              <a href="/goals" className="text-muted hover:text-ink">Goals</a>
              <a href="/funds" className="text-muted hover:text-ink">Funds</a>
              <a href="/components-map" className="text-muted hover:text-ink">Components map</a>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="mx-auto w-full max-w-5xl px-4 pb-8 text-xs text-muted">
          Data: mfapi.in, Yahoo Finance, Google News. Commentary by Gemini Flash. Informational only, not investment advice.
        </footer>
      </body>
    </html>
  );
}
