"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "theme";

/** Runs before paint (inlined in layout) so the saved theme applies without a flash. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => { setTheme((document.documentElement.dataset.theme as Theme) || "light"); }, []);
  const set = (t: Theme) => {
    setTheme(t);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(KEY, t); } catch {}
  };
  const dark = theme === "dark";
  const icon = dark
    ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
    : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>;
  if (compact)
    return (
      <button type="button" onClick={() => set(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={dark}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:bg-wash hover:text-ink">
        {icon}
      </button>
    );
  return (
    <div className="seg" role="group" aria-label="Appearance">
      <button type="button" aria-pressed={theme === "light"} onClick={() => set("light")}>Light</button>
      <button type="button" aria-pressed={dark} onClick={() => set("dark")}>Dark</button>
    </div>
  );
}
