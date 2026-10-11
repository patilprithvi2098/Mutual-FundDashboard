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
          <nav className="mx-auto flex max-w-5xl items-center gap-5 px-4 py-3 text-sm">
            <a href="/" className="mr-auto font-semibold tracking-tight">Meera&apos;s Fund Tracker</a>
            <a href="/" className="text-muted hover:text-ink">Report</a>
            <a href="/history" className="text-muted hover:text-ink">Trends</a>
            <a href="/funds" className="text-muted hover:text-ink">Manage funds</a>
            <a href="/components-map" className="text-muted hover:text-ink">Components map</a>
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
