import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Brand, BottomNav, Sidebar } from "@/components/Nav";
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
  title: "Meera's Wealth",
  description: "Plain-language weekly mutual fund report with benchmark and market context.",
};
export const viewport: Viewport = { themeColor: "#f7f8f7" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center border-b border-line bg-card px-4 py-3 lg:hidden"><Brand /></header>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
            <footer className="mx-auto w-full max-w-6xl px-4 pb-28 text-xs leading-relaxed text-muted sm:px-6 lg:px-10 lg:pb-8">
              Data: mfapi.in, Yahoo Finance, Google News. Commentary by Gemini Flash. Informational only, not investment advice.
            </footer>
          </div>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
