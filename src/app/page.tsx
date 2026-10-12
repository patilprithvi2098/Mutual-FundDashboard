import { latestReport } from "@/lib/queries";
import { activeFunds, seedIfEmpty } from "@/lib/pipeline";
import { chartData } from "@/lib/chart";
import { VERDICTS, longDate, shortDate, marketParagraph, pct } from "@/lib/ledger";
import FundRow from "@/components/FundRow";
import FundChart from "@/components/FundChart";
import Tip from "@/components/Tip";
import SipCard from "@/components/SipCard";
import RunButton from "@/components/RunButton";
import GoalsCard from "@/components/GoalsCard";
import MoneyComparison from "@/components/MoneyComparison";
import { listGoals } from "@/lib/goals";

export const dynamic = "force-dynamic";

export default async function Home() {
  let data = null;
  let err = "";
  try {
    await seedIfEmpty();
    data = await latestReport();
  } catch (e) {
    err = (e as Error).message;
  }
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
  const funds = await activeFunds();
  const symbol = new Map(funds.map((f) => [f.scheme_code, f.benchmark_symbol as string | null]));
  const charts = await Promise.all(snaps.map((s) => chartData(s.scheme_code, symbol.get(s.scheme_code) ?? null, s.as_of).catch(() => null)));
  const navAsOf = snaps.map((s) => s.as_of).sort().at(-1) ?? r.week_ending;
  const active = VERDICTS.indexOf(r.assessment as (typeof VERDICTS)[number]);
  const hues = ["var(--l-ok)", "var(--l-watch)", "var(--l-review)"];
  // Goals are separate from the report; if they fail to load, the report still renders.
  const goals = await listGoals().catch(() => null);

  return (
    <div className="ledger">
      <div className="grid gap-x-16 gap-y-14 lg:grid-cols-[380px_minmax(0,1fr)]">
        <header className="self-start lg:sticky lg:top-8">
          <p className="l-faint font-mono text-xs tracking-[0.08em]">WEEKLY REPORT · GENERATED {shortDate(r.generated_at)}</p>
          <p className="l-muted mt-3 text-sm leading-relaxed [text-wrap:pretty]">
            A plain-language weekly report on Meera&apos;s mutual funds, written by Gemini Flash from live fund prices, index levels and market news.
          </p>
          <p className="l-faint mt-8 font-mono text-[11px] uppercase tracking-[0.06em]">The three possible verdicts</p>
          <div className="mt-2 flex gap-1.5">
            {VERDICTS.map((v, i) => (<div key={v} style={i === active ? { background: hues[i] } : undefined} className={`h-1 flex-1 rounded-sm ${i === active ? "" : "l-bar-off"}`} />))}
          </div>
          <div className="mt-2 flex gap-1.5 text-[11px] leading-snug">
            {VERDICTS.map((v, i) => (<div key={v} style={i === active ? { color: hues[i] } : undefined} className={`flex-1 ${i === active ? "font-medium" : "l-faint"}`}>{v}</div>))}
          </div>
          <h1 className="mt-7 text-[32px] font-semibold leading-[1.12] tracking-tight lg:text-[38px]">{r.assessment}</h1>
          <p className="l-soft mt-3.5 text-[17px] leading-relaxed [text-wrap:pretty] lg:text-lg">{r.reason}</p>
          <p className="l-faint mt-4 font-mono text-xs">Updated with NAV as of {longDate(navAsOf)}</p>
          {!r.ai_used && <p className="l-chip mt-3">Written by our backup rules</p>}
        </header>

        <div>
          <section>
            <h2 className="text-lg font-semibold lg:text-xl">Your funds</h2>
            <p className="l-muted mt-1.5 text-sm leading-relaxed lg:text-[15px]">Each fund is shown next to the index it is measured against, for the past week.</p>
            <div className="l-faint mt-5 grid grid-cols-[minmax(0,1fr)_64px_76px] gap-x-3 pb-2 font-mono text-[11px] uppercase tracking-[0.06em] lg:grid-cols-[minmax(0,1fr)_150px_80px_100px] lg:gap-x-4">
              <span />
              <span className="hidden lg:block" />
              <span className="text-right">Fund</span>
              <span className="text-right">Benchmark<Tip term="benchmark" align="right" /></span>
            </div>
            {snaps.map((s, i) => (
              <FundRow key={s.scheme_code} name={s.fund_name} status={s.status} fund1w={s.ret_1w} bench1w={s.bench_1w} summary={s.summary ?? "A written summary is not available for this week."}>
                {charts[i] && <FundChart data={charts[i]!} fundName={s.fund_name} />}
                {s.cat_1w != null && (
                  <p className="l-muted mt-4 text-sm">Category average this week <span className="num font-mono l-soft">{pct(s.cat_1w)}</span><Tip term="category" /></p>
                )}
              </FundRow>
            ))}
            <div className="border-t l-line" />
          </section>

          <section className="mt-14">
            <h2 className="text-lg font-semibold lg:text-xl">The market this week</h2>
            <p className="l-soft mt-3 max-w-[620px] text-base leading-[1.65] [text-wrap:pretty] lg:text-[17px]">{marketParagraph(r.market_summary, r.market)}</p>
          </section>

          <SipCard />

          {goals && <GoalsCard goals={goals} />}

          <MoneyComparison />

          <div className="l-faint mt-14 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span>{r.ai_used ? `Written by ${r.model}` : ""}</span>
            <RunButton label="Regenerate now" />
          </div>
        </div>
      </div>
    </div>
  );
}
