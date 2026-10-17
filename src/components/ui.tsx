import { STATUS } from "@/lib/ledger";

export const fmt = (v: string | number | null | undefined, plus = true) => {
  if (v == null) return "–";
  const n = Number(v);
  return `${plus && n > 0 ? "+" : ""}${n.toFixed(2)}%`;
};
export const tone = (n: number | string | null | undefined) => (n == null ? "text-muted" : Math.abs(Number(n)) < 0.05 ? "text-soft" : Number(n) > 0 ? "text-good" : "text-bad");

const PILL: Record<string, string> = {
  ok: "bg-good-soft text-good",
  watch: "bg-warn-soft text-warn",
  review: "bg-bad-soft text-bad",
};
export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${PILL[status] ?? PILL.ok}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{(STATUS[status] ?? STATUS.ok).word}
    </span>
  );
}

export function Sparkline({ data, className = "" }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), W = 120, H = 32;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - 2 - ((v - min) / (max - min || 1)) * (H - 4)}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`h-8 w-24 ${className}`} role="img" aria-label={`NAV trend, last ${data.length} trading days, ${up ? "up" : "down"}`}>
      <polyline points={pts} fill="none" stroke={up ? "var(--good)" : "var(--bad)"} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-tight lg:text-[30px]">{title}</h1>
      {children && <div className="mt-2 max-w-[680px] text-[15px] leading-relaxed text-muted [text-wrap:pretty]">{children}</div>}
    </header>
  );
}

/** Three market index tiles. */
export function MarketCards({ market, className = "sm:grid-cols-3" }: { market: { index: string; w: number | null; m: number | null; ytd: number | null }[]; className?: string }) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {market.map((m) => (
        <div key={m.index} className="card p-4">
          <p className="text-sm text-muted">{m.index}</p>
          <p className={`num mt-1 text-xl font-semibold ${tone(m.w)}`}>{pctS(m.w)}</p>
          <p className="mt-0.5 text-xs text-muted">this week</p>
          <div className="mt-3 flex gap-4 border-t border-line pt-3 text-xs text-muted">
            <span>1M <span className={`num font-medium ${tone(m.m)}`}>{pctS(m.m)}</span></span>
            <span>YTD <span className={`num font-medium ${tone(m.ytd)}`}>{pctS(m.ytd)}</span></span>
          </div>
        </div>
      ))}
    </div>
  );
}
export function pctS(v: number | string | null | undefined) {
  if (v == null) return "n/a";
  const n = Math.round(Number(v) * 10) / 10;
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;
}
