import { notFound } from "next/navigation";
import { q } from "@/lib/db";
import type { FundRow } from "@/lib/pipeline";
import type { Snapshot } from "@/lib/queries";
import { chartData } from "@/lib/chart";
import { longDate, shortDate, STATUS } from "@/lib/ledger";
import { indexSeries, initials, inr0, loadPortfolio, plainCategory, returnsGrid, shortName, type Grid } from "@/lib/portfolio";
import FundChart from "@/components/FundChart";
import Tip from "@/components/Tip";
import { PageHead, StatusPill, pctS, tone } from "@/components/ui";

export const dynamic = "force-dynamic";

const KEYS: [keyof Grid, string][] = [["w", "1 week"], ["m", "1 month"], ["m3", "3 months"], ["ytd", "Year to date"], ["y1", "1 year"]];
const HUE: Record<string, string> = { ok: "var(--good)", watch: "var(--warn)", review: "var(--bad)" };

export default async function FundPage({ params }: { params: Promise<{ code: string }> }) {
  const code = Number((await params).code);
  if (!Number.isInteger(code)) notFound();
  const [fund] = await q<FundRow>(`select * from funds where scheme_code=$1`, [code]);
  if (!fund) notFound();

  const [pf, snaps, bench] = await Promise.all([
    loadPortfolio(),
    q<Snapshot>(`select week_ending::text, as_of::text, ret_1w::text, ret_1m::text, ret_ytd::text, bench_1w::text, bench_1m::text, bench_ytd::text,
      cat_1w::text, cat_1m::text, cat_ytd::text, status, summary from weekly_snapshots where scheme_code=$1 order by week_ending desc limit 12`, [code]),
    fund.benchmark_symbol ? indexSeries(fund.benchmark_symbol) : Promise.resolve([]),
  ]);
  const navs = pf.navs.get(code) ?? [];
  const holding = pf.holdings.find((h) => h.scheme_code === code);
  const latest = snaps[0];
  const asOf = navs.at(-1)?.date;
  const fundG = returnsGrid(navs, asOf), benchG = returnsGrid(bench, asOf);
  const charts = asOf ? await chartData(code, fund.benchmark_symbol, asOf).catch(() => null) : null;
  const cat: Partial<Grid> = latest ? { w: num(latest.cat_1w), m: num(latest.cat_1m), ytd: num(latest.cat_ytd) } : {};
  const strip = [...snaps].reverse();

  return (
    <div className="space-y-8">
      <a href="/fund" className="text-sm text-muted hover:text-ink">&larr; All funds</a>
      <div className="flex items-start gap-4">
        <span className="badge h-12 w-12 text-base">{initials(fund.name)}</span>
        <div className="min-w-0 flex-1">
          <PageHead title={shortName(fund.name)}>
            {plainCategory(fund.category, fund.name)} · {fund.fund_house} · Scheme code {fund.scheme_code}
            {!fund.active && " · No longer tracked"}
          </PageHead>
        </div>
        {latest && <StatusPill status={latest.status} />}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-muted">Latest NAV</p>
          <p className="num mt-1 text-xl font-semibold">{navs.length ? `₹${navs.at(-1)!.value.toFixed(2)}` : "n/a"}</p>
          <p className="mt-0.5 text-xs text-faint">{asOf ? longDate(asOf) : ""}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Your SIP value</p>
          <p className="num mt-1 text-xl font-semibold">{holding ? inr0(holding.value) : "n/a"}</p>
          <p className="mt-0.5 text-xs text-faint">{holding ? `${inr0(holding.invested)} invested at ${inr0(pf.sipByCode[code] ?? 0)} a month` : ""}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Measured against</p>
          <p className="mt-1 text-base font-semibold leading-snug">{fund.benchmark_name ?? "Category average only"}</p>
          <p className="mt-0.5 text-xs text-faint">{fund.benchmark_name ? "Its stated benchmark index" : "No free index feed for this category"}</p>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="text-base font-semibold">Returns</h2>
        <p className="mt-1 text-sm text-muted">Change in NAV up to {asOf ? longDate(asOf) : "the latest date"}, computed from stored price history.</p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {KEYS.map(([k, label]) => (
            <div key={k} className="rounded-xl bg-wash p-3">
              <p className="text-[11px] text-muted sm:text-xs">{label}{k === "ytd" && <Tip term="ytd" />}</p>
              <p className={`num mt-1 text-[17px] font-semibold ${fundG[k] == null ? "text-faint" : tone(fundG[k])}`}>{pctS(fundG[k])}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-6 text-sm font-semibold">Compared with</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 font-medium" />
                {KEYS.map(([k, l]) => <th key={k} className="num py-2 text-right font-medium">{l}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <Row label="Your fund" g={fundG} strong />
              {fund.benchmark_name && <Row label={<>{fund.benchmark_name}<Tip term="benchmark" /></>} g={benchG} />}
              <Row label={<>Category average<Tip term="category" /></>} g={{ w: cat.w ?? null, m: cat.m ?? null, m3: null, ytd: cat.ytd ?? null, y1: null }} />
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-faint">The category average is only collected for 1 week, 1 month and year to date, so the 3-month and 1-year cells are blank.</p>
      </section>

      {charts && (
        <section className="card p-5">
          <h2 className="text-base font-semibold">Fund against its benchmark</h2>
          <div className="mt-3"><FundChart data={charts} fundName={shortName(fund.name)} /></div>
        </section>
      )}

      {latest && (
        <section className="card p-5">
          <p className="eyebrow">This week&apos;s summary · week ending {shortDate(latest.week_ending)}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-soft [text-wrap:pretty]">{latest.summary ?? "A written summary is not available for this week."}</p>
          <a href="/report" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">Read the full weekly report &rarr;</a>
        </section>
      )}

      {strip.length > 0 && (
        <section className="card p-5">
          <h2 className="text-base font-semibold">The last {strip.length} weeks</h2>
          <div className="mt-3 flex gap-1">
            {strip.map((s) => (<div key={s.week_ending} title={`Week ending ${shortDate(s.week_ending)}: ${STATUS[s.status].word}`} className="h-8 flex-1 rounded-[4px]" style={{ background: HUE[s.status] }} />))}
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[11px] text-faint"><span>{shortDate(strip[0].week_ending)}</span><span>{shortDate(strip.at(-1)!.week_ending)}</span></div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {(["ok", "watch", "review"] as const).map((k) => (<span key={k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: HUE[k] }} />{STATUS[k].word}</span>))}
          </div>
        </section>
      )}
    </div>
  );
}

const num = (v: string | null) => (v == null ? null : Number(v));
function Row({ label, g, strong }: { label: React.ReactNode; g: Grid; strong?: boolean }) {
  return (
    <tr>
      <td className={`py-2.5 pr-3 ${strong ? "font-medium" : "text-soft"}`}>{label}</td>
      {KEYS.map(([k]) => (<td key={k} className={`num py-2.5 text-right ${g[k] == null ? "text-faint" : strong ? `font-semibold ${tone(g[k])}` : "text-soft"}`}>{g[k] == null ? "–" : pctS(g[k])}</td>))}
    </tr>
  );
}
