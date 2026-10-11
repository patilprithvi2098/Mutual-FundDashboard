export const fmt = (v: string | number | null | undefined, plus = true) => {
  if (v == null) return "–";
  const n = Number(v);
  return `${plus && n > 0 ? "+" : ""}${n.toFixed(2)}%`;
};
export const tone = (n: number | null) => (n == null ? "text-muted" : n >= 0 ? "text-good" : "text-bad");

export function StatusPill({ status }: { status: string }) {
  const m: Record<string, [string, string]> = {
    ok: ["On track", "bg-emerald-50 text-good border-emerald-200"],
    watch: ["Worth watching", "bg-amber-50 text-warn border-amber-200"],
    review: ["Review", "bg-red-50 text-bad border-red-200"],
  };
  const [label, cls] = m[status] ?? m.ok;
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function Sparkline({ data, className = "" }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), W = 120, H = 32;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - 2 - ((v - min) / (max - min || 1)) * (H - 4)}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`h-8 w-28 ${className}`} role="img" aria-label="NAV trend, last 120 days">
      <polyline points={pts} fill="none" stroke={up ? "var(--good)" : "var(--bad)"} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
