import { history, reportsList } from "@/lib/queries";
import { StatusPill, fmt, tone } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function History() {
  const [snaps, reports] = await Promise.all([history(), reportsList()]);
  if (!snaps.length) return <p className="text-muted">No weekly snapshots yet. Generate a report from the home page.</p>;
  const weeks = [...new Set(snaps.map((s) => s.week_ending))];
  const funds = [...new Map(snaps.map((s) => [s.scheme_code, s.fund_name])).entries()];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Weekly trends</h1>
      <p className="text-muted">One row per saved weekly snapshot. Excess = fund return minus benchmark (or category average when no benchmark exists), over one month.</p>
      <div className="flex flex-wrap gap-2">
        {reports.map((r) => <span key={r.week_ending} className="rounded-full border border-line bg-card px-3 py-1 text-xs">{r.week_ending}: {r.assessment}</span>)}
      </div>
      {funds.map(([code, name]) => {
        const rows = snaps.filter((s) => s.scheme_code === code);
        const ex = rows.map((s) => { const ref = s.bench_1m ?? s.cat_1m; return s.ret_1m != null && ref != null ? Number(s.ret_1m) - Number(ref) : 0; });
        const max = Math.max(1, ...ex.map(Math.abs));
        return (
          <section key={code} className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-semibold">{name}</h2>
            {rows.length > 1 && (
              <svg viewBox={`0 0 ${weeks.length * 40} 60`} className="mt-2 h-16 w-full max-w-md" role="img" aria-label="Excess return by week">
                <line x1="0" x2={weeks.length * 40} y1="30" y2="30" stroke="var(--line)" />
                {ex.map((v, i) => <rect key={i} x={i * 40 + 8} width="24" y={v >= 0 ? 30 - (v / max) * 26 : 30} height={Math.max(1, (Math.abs(v) / max) * 26)} fill={v >= 0 ? "var(--good)" : "var(--bad)"} rx="2" />)}
              </svg>
            )}
            <table className="mt-3 w-full text-sm">
              <thead><tr className="text-left text-xs text-muted"><th className="font-normal">Week ending</th><th className="text-right font-normal">1W</th><th className="text-right font-normal">1M</th><th className="text-right font-normal">YTD</th><th className="text-right font-normal">1M vs benchmark</th><th className="text-right font-normal">Status</th></tr></thead>
              <tbody>
                {rows.map((s) => { const ref = s.bench_1m ?? s.cat_1m; const d = s.ret_1m != null && ref != null ? Number(s.ret_1m) - Number(ref) : null; return (
                  <tr key={s.week_ending} className="border-t border-line">
                    <td className="py-1.5">{s.week_ending}</td>
                    <td className={`num text-right ${tone(Number(s.ret_1w))}`}>{fmt(s.ret_1w)}</td>
                    <td className={`num text-right ${tone(Number(s.ret_1m))}`}>{fmt(s.ret_1m)}</td>
                    <td className={`num text-right ${tone(Number(s.ret_ytd))}`}>{fmt(s.ret_ytd)}</td>
                    <td className={`num text-right ${tone(d)}`}>{d == null ? "–" : `${d > 0 ? "+" : ""}${d.toFixed(1)}pp`}</td>
                    <td className="py-1.5 text-right"><StatusPill status={s.status} /></td>
                  </tr>); })}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
