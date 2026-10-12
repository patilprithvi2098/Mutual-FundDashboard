"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const I = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);
const ICONS = {
  home: I(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>),
  report: I(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></>),
  funds: I(<><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6.4 6.4" /></>),
  insights: I(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
  goals: I(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  manage: I(<><path d="M12 5v14M5 12h14" /></>),
  more: I(<><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>),
  map: I(<><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>),
};

const MAIN = [
  { href: "/", label: "Overview", icon: ICONS.home },
  { href: "/report", label: "Weekly report", icon: ICONS.report },
  { href: "/fund", label: "My funds", icon: ICONS.funds },
  { href: "/history", label: "Insights", icon: ICONS.insights },
  { href: "/goals", label: "Goals", icon: ICONS.goals },
  { href: "/funds", label: "Manage funds", icon: ICONS.manage },
];
const MOBILE = [
  { href: "/", label: "Home", icon: ICONS.home },
  { href: "/report", label: "Report", icon: ICONS.report },
  { href: "/fund", label: "Funds", icon: ICONS.funds },
  { href: "/history", label: "Insights", icon: ICONS.insights },
  { href: "/more", label: "More", icon: ICONS.more, also: ["/goals", "/funds", "/example", "/components-map"] },
];

function isActive(path: string, href: string, also: string[] = []) {
  if (href === "/") return path === "/";
  // "/fund" must not light up for "/funds".
  const hit = (h: string) => path === h || path.startsWith(h + "/");
  return hit(href) || also.some(hit);
}

export function Brand() {
  return (
    <a href="/" className="flex items-center gap-2.5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" /><path d="M5 19 13 11" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight text-ink">Meera&apos;s Wealth</span>
        <span className="block text-xs text-muted">Simple. Clear. Informed.</span>
      </span>
    </a>
  );
}

export function Sidebar() {
  const path = usePathname();
  const link = (href: string, label: string, icon: ReactNode) => {
    const on = isActive(path, href);
    return (
      <a key={href} href={href} aria-current={on ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${on ? "bg-accent-soft text-accent" : "text-muted hover:bg-wash hover:text-ink"}`}>
        {icon}{label}
      </a>
    );
  };
  return (
    <aside className="sticky top-0 hidden h-screen w-60 flex-none flex-col border-r border-line bg-card px-4 py-6 lg:flex">
      <div className="px-2"><Brand /></div>
      <nav className="mt-8 flex flex-col gap-1" aria-label="Main">{MAIN.map((m) => link(m.href, m.label, m.icon))}</nav>
      <div className="mt-auto border-t border-line pt-4">{link("/components-map", "How it's built", ICONS.map)}</div>
    </aside>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE.map((m) => {
          const on = isActive(path, m.href, m.also);
          return (
            <a key={m.href} href={m.href} aria-current={on ? "page" : undefined}
              className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${on ? "text-accent" : "text-muted"}`}>
              {m.icon}{m.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
