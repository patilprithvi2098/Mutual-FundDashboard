import { latestReport, navTail } from "@/lib/queries";
import { seedIfEmpty } from "@/lib/pipeline";
import { StatusPill, Sparkline, fmt, tone } from "@/components/ui";
import RunButton from "@/components/RunButton";

export const dynamic = "force-dynamic";

const banner: Record<string, string> = {
  "No action needed": "border-emerald-200 bg-emerald-50 text-good",
  "One fund worth watching": "border-amber-200 bg-amber-50 text-warn",
  "Consider reviewing your allocation": "border-red-200 bg-red-50 text-bad",
};
const driverText: Record<string, string> = {
  "market-wide": "Moved with the market", "fund-specific": "Fund-specific move", outperforming: "Beating its benchmark", "in-line": "In line with benchmark",
};

function Row({ label, f, b, c }: { label: string; f: string | null; b: string | null; c: string | null }) {
  const d = (x: string | null) => (f != null && x != null ? Number(f) - Number(x) : null);
  return (
    <tr className="border-t border-line">
      <td className="py-1.5 text-muted">{label}</td>
      <td className={`num py-1.5 text-right font-medium ${tone(f == null ? null : Number(f))}`}>{fmt(f)}</td>
      <td className="num py-1.5 text-right">{fmt(b)}</td>
      <td className="num py-1.5 text-right">{fmt(c)}</td>
      <td className={`num py-1.5 text-right ${tone(d(b))}`}>{d(b) == null ? "–" : `${d(b)! > 0 ? "+" : ""}${d(b)!.toFixed(1)}pp`}</td>
    </tr>
  );
}

export default async function Home() {
  let data = null; let err = "";
  try { await seedIfEmpty(); data = await latestReport(); } catch (e) { err = (e as Error).message; }
  if (err) return <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-bad">Could not reach the database: {err}</p>;
  if (!data)
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">No report yet</h1>
        <p className="text-muted">Your five starter funds are set up. Generate the first report, or wait for Saturday morning’s automatic run.</p>
        <RunButton />
      </div>
    );
  const { report: r, snaps } = data;
  const sparks = await Promise.all(snaps.map((s) => navTail(s.scheme_code)));
  const generated = new Date(r.generated_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted">Week ending Saturday {r.week_ending} · generated {generated} IST</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Good morning, Meera.</h1>
      </div>

      <section className={`rounded-2xl border p-5 ${banner[r.assessment] ?? "border-line bg-card"}`}>
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">Overall portfolio assessment</p>
        <p className="mt-1 text-2xl font-semibold">{r.assessment}</p>
        <p className="mt-2 text-ink">{r.reason}</p>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-semibold">The market this week</h2>
        {r.market_summary && <p className="mt-1 text-muted">{r.market_summary}</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {r.market.map((m) => (
            <div key={m.index} className="rounded-lg bg-bg p-3">
              <p className="text-xs text-muted">{m.index}</p>
              <p className={`num text-xl font-semibold ${tone(m.w)}`}>{fmt(m.w)}</p>
              <p className="num text-xs text-muted">1M {fmt(m.m)} · YTD {fmt(m.ytd)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {snaps.map((s, i) => (
          <article key={s.scheme_code} className="rounded-2xl border border-line bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{s.fund_name}</h3>
                <p className="text-xs text-muted">{s.category} · NAV ₹{Number(s.nav).toFixed(2)} as of {s.as_of}</p>
              </div>
              <div className="flex items-center gap-3">
                <Sparkline data={sparks[i]} />
                <StatusPill status={s.status} />
              </div>
            </div>
            <p className="mt-3 leading-relaxed">{s.summary}</p>
            <p className="mt-2 text-xs text-muted">{driverText[s.driver] ?? s.driver}</p>
            <table className="mt-3 w-full text-sm">
              <thead><tr className="text-xs text-muted">
                <th className="text-left font-normal"></th><th className="text-right font-normal">Fund</th>
                <th className="text-right font-normal">{s.benchmark_name ?? "Benchmark n/a"}</th>
                <th className="text-right font-normal">Category avg{s.peer_count ? ` (${s.peer_count})` : ""}</th>
                <th className="text-right font-normal">vs benchmark</th></tr></thead>
              <tbody>
                <Row label="1 week" f={s.ret_1w} b={s.bench_1w} c={s.cat_1w} />
                <Row label="1 month" f={s.ret_1m} b={s.bench_1m} c={s.cat_1m} />
                <Row label="Year to date" f={s.ret_ytd} b={s.bench_ytd} c={s.cat_ytd} />
              </tbody>
            </table>
          </article>
        ))}
      </section>

      {r.headlines.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-semibold">Headlines behind the commentary</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {r.headlines.slice(0, 8).map((h, i) => <li key={i}>{h.title} <span className="text-xs">({h.source}, {h.published})</span></li>)}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>{r.ai_used ? `Written by ${r.model}` : "AI commentary was unavailable; showing rule-based text."}</span>
        <RunButton label="Regenerate now" />
      </div>
    </div>
  );
}
