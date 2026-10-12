/** Allocation donut: one arc per fund, fixed categorical order, 2px surface gaps, centre label. */
export const SERIES = ["#3730a3", "#0f766e", "#b45309", "#be185d", "#475569", "#0369a1", "#7c3aed", "#4d7c0f"];

export default function Donut({ parts, centre, sub }: { parts: { label: string; value: number }[]; centre: string; sub: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const R = 42, C = 2 * Math.PI * R, gap = 2;
  let acc = 0;
  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40 flex-none" role="img" aria-label={`Allocation: ${parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(", ")}`}>
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--wash)" strokeWidth="12" />
      {parts.map((p, i) => {
        const len = Math.max(0, (p.value / total) * C - gap), off = -acc * C;
        acc += p.value / total;
        return <circle key={p.label} cx="60" cy="60" r={R} fill="none" stroke={SERIES[i % SERIES.length]} strokeWidth="12" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={off} transform="rotate(-90 60 60)" />;
      })}
      <text x="60" y="57" textAnchor="middle" className="num" style={{ font: "600 13px var(--font-geist-sans), sans-serif", fill: "var(--ink)" }}>{centre}</text>
      <text x="60" y="71" textAnchor="middle" style={{ font: "400 9px var(--font-geist-sans), sans-serif", fill: "var(--muted)" }}>{sub}</text>
    </svg>
  );
}
