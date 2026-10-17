import { latestReport } from "@/lib/queries";
import { seedIfEmpty } from "@/lib/pipeline";
import { longDate, marketParagraph } from "@/lib/ledger";
import RunButton from "@/components/RunButton";
import { AssessmentCard, FundCard } from "@/components/ReportParts";
import { MarketCards, PageHead } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weekly report · Meera's Wealth" };

export default async function ReportPage() {
  let data = null;
  let err = "";
  try {
    await seedIfEmpty();
    data = await latestReport();
  } catch (e) {
    err = (e as Error).message;
  }
  if (err) return <p className="card border-bad/30 bg-bad-soft p-4 text-bad">Could not reach the database: {err}</p>;
  if (!data)
    return (
      <div className="space-y-4">
        <PageHead title="No report yet">Your five starter funds are set up. Generate the first report, or wait for Saturday morning’s automatic run.</PageHead>
        <RunButton />
      </div>
    );

  const { report: r, snaps } = data;
  const navAsOf = snaps.map((s) => s.as_of).sort().at(-1) ?? r.week_ending;

  return (
    <div className="space-y-8">
      <PageHead eyebrow={`Week ending ${longDate(r.week_ending)}`} title="Weekly report">
        A plain-language report on Meera&apos;s funds, written by Gemini Flash from live fund prices, index levels and market news.
      </PageHead>

      <AssessmentCard assessment={r.assessment} reason={r.reason}>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-muted">NAV as of {longDate(navAsOf)}</span>
          <a href="/example" className="py-1 font-medium text-accent hover:underline">See what a warning looks like</a>
          {!r.ai_used && <span className="rounded-full border border-line bg-wash px-2.5 py-1 font-mono text-xs text-soft">Written by our backup rules</span>}
        </div>
      </AssessmentCard>

      <section>
        <h2 className="text-lg font-semibold">The market this week</h2>
        <div className="mt-3"><MarketCards market={r.market} /></div>
        <p className="mt-4 max-w-[720px] text-[15px] leading-relaxed text-soft [text-wrap:pretty]">{marketParagraph(r.market_summary, r.market)}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Your funds</h2>
        <p className="mt-1 text-sm text-muted">Each fund next to the index it is measured against and the average of similar funds, for the past week.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {snaps.map((s) => (
            <FundCard key={s.scheme_code} code={s.scheme_code} name={s.fund_name} category={s.category} status={s.status} summary={s.summary}
              fund1w={s.ret_1w} bench1w={s.bench_1w} cat1w={s.cat_1w} benchName={s.benchmark_name} href={`/fund/${s.scheme_code}`} />
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs text-muted">
        <span>{r.ai_used ? `Written by ${r.model}` : "Written by the backup rules"}</span>
        <RunButton label="Regenerate now" />
      </div>
    </div>
  );
}
