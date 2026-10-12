import { latestReport } from "@/lib/queries";
import { seedIfEmpty } from "@/lib/pipeline";
import { VERDICTS, longDate, shortDate, marketParagraph } from "@/lib/ledger";
import FundRow from "@/components/FundRow";
import RunButton from "@/components/RunButton";

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
  const navAsOf = snaps.map((s) => s.as_of).sort().at(-1) ?? r.week_ending;
  const active = VERDICTS.indexOf(r.assessment as (typeof VERDICTS)[number]);

  return (
    <div className="ledger">
      <div className="grid gap-x-16 gap-y-14 lg:grid-cols-[380px_minmax(0,1fr)]">
        <header className="self-start lg:sticky lg:top-8">
          <p className="font-mono text-xs tracking-[0.08em] l-faint">SATURDAY REPORT · {shortDate(r.week_ending)}</p>
          <div className="mt-9 flex gap-1.5">
            {VERDICTS.map((v, i) => (
              <div key={v} style={i === active ? { background: ["var(--l-ok)", "var(--l-watch)", "var(--l-review)"][i] } : undefined} className={`h-1 flex-1 rounded-sm ${i === active ? "" : "l-bar-off"}`} />
            ))}
          </div>
          <div className="mt-2 flex gap-1.5 text-[11px] leading-snug">
            {VERDICTS.map((v, i) => (
              <div key={v} style={i === active ? { color: ["var(--l-ok)", "var(--l-watch)", "var(--l-review)"][i] } : undefined} className={`flex-1 ${i === active ? "font-medium" : "l-faint"}`}>{v}</div>
            ))}
          </div>
          <h1 className="mt-7 text-[32px] font-semibold leading-[1.12] tracking-tight lg:text-[38px]">{r.assessment}</h1>
          <p className="mt-3.5 text-[17px] leading-relaxed l-soft [text-wrap:pretty] lg:text-lg">{r.reason}</p>
          <p className="mt-4 font-mono text-xs l-faint">Updated with NAV as of {longDate(navAsOf)}</p>
        </header>

        <div>
          <section>
            <h2 className="text-lg font-semibold lg:text-xl">Your funds</h2>
            <p className="mt-1.5 text-sm leading-relaxed l-muted lg:text-[15px]">
              Each fund is shown next to the index it is measured against, for the past week.
            </p>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_64px_76px] gap-x-3 pb-2 font-mono text-[11px] uppercase tracking-[0.06em] l-faint lg:grid-cols-[minmax(0,1fr)_150px_80px_100px] lg:gap-x-4">
              <span />
              <span className="hidden lg:block" />
              <span className="text-right">Fund</span>
              <span className="text-right">Benchmark</span>
            </div>
            {snaps.map((s) => (
              <FundRow key={s.scheme_code} name={s.fund_name} status={s.status} fund1w={s.ret_1w} bench1w={s.bench_1w} summary={s.summary} />
            ))}
            <div className="border-t l-line" />
          </section>

          <section className="mt-14">
            <h2 className="text-lg font-semibold lg:text-xl">The market this week</h2>
            <p className="mt-3 max-w-[620px] text-base leading-[1.65] l-soft [text-wrap:pretty] lg:text-[17px]">
              {marketParagraph(r.market_summary, r.market)}
            </p>
          </section>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-3 text-xs l-faint">
            <span>{r.ai_used ? `Written by ${r.model}` : "AI commentary was unavailable; showing rule-based text."}</span>
            <RunButton label="Regenerate now" />
          </div>
        </div>
      </div>
    </div>
  );
}
