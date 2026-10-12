import { q } from "@/lib/db";
import { VERDICTS, longDate } from "@/lib/ledger";
import FundRow from "@/components/FundRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Example warning" };

type Example = {
  built_at: string; model: string; based_on_week: string; stressed_fund: string; shift: { w: number; m: number; ytd: number };
  assessment: string; reason: string; market_summary: string;
  funds: { scheme_code: number; fund_name: string; status: string; stressed: boolean; ret_1w: number | null; bench_1w: number | null; summary: string | null }[];
};

/** Saved output of scripts/build-example.ts: real rules and a real Gemini call on simulated numbers. Viewing it calls no AI. */
export default async function ExamplePage() {
  const rows = await q<{ data: Example }>(`select data from example_report where id = 1`).catch(() => []);
  const ex = rows[0]?.data;
  if (!ex) return <p className="text-muted">The example has not been built yet. Run <code>npm run build-example</code>.</p>;
  const active = VERDICTS.indexOf(ex.assessment as (typeof VERDICTS)[number]);
  const hues = ["var(--l-ok)", "var(--l-watch)", "var(--l-review)"];

  return (
    <div className="ledger">
      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[360px_minmax(0,1fr)]">
        <header className="self-start lg:sticky lg:top-8">
          <a href="/report" className="l-muted text-sm hover:underline">Back to this week&apos;s report</a>
          <p className="l-faint mt-6 font-mono text-xs tracking-[0.08em]">EXAMPLE · SIMULATED NUMBERS</p>
          <div className="l-card mt-4 p-4 text-sm leading-relaxed">
            <p className="font-semibold">This is what a warning looks like.</p>
            <p className="l-soft mt-2 [text-wrap:pretty]">
              Every fund has been on track for weeks, so the real report has not needed to warn Meera yet. This page copies the report for the week
              to {longDate(ex.based_on_week)} and lowers {ex.stressed_fund}&apos;s returns so it trails its benchmark by {ex.shift.m} points over the month
              and {ex.shift.w} points over the week. The real rules then flag it, and Gemini Flash ({ex.model}) writes the explanation.
              The other funds keep their real numbers.
            </p>
          </div>
          <p className="l-faint mt-8 font-mono text-[11px] uppercase tracking-[0.06em]">The three possible verdicts</p>
          <div className="mt-2 flex gap-1.5">
            {VERDICTS.map((v, i) => (<div key={v} style={i === active ? { background: hues[i] } : undefined} className={`h-1 flex-1 rounded-sm ${i === active ? "" : "l-bar-off"}`} />))}
          </div>
          <div className="mt-2 flex gap-1.5 text-[11px] leading-snug">
            {VERDICTS.map((v, i) => (<div key={v} style={i === active ? { color: hues[i] } : undefined} className={`flex-1 ${i === active ? "font-medium" : "l-faint"}`}>{v}</div>))}
          </div>
          <h1 className="mt-7 text-[32px] font-semibold leading-[1.12] tracking-tight lg:text-[38px]">{ex.assessment}</h1>
          <p className="l-soft mt-3.5 text-[17px] leading-relaxed [text-wrap:pretty] lg:text-lg">{ex.reason}</p>
        </header>

        <div>
          <section>
            <h2 className="text-lg font-semibold lg:text-xl">Funds in this example</h2>
            <p className="l-muted mt-1.5 text-sm leading-relaxed lg:text-[15px]">Tap a fund to read what Gemini wrote about it. The simulated fund is marked.</p>
            <div className="l-faint mt-5 grid grid-cols-[minmax(0,1fr)_64px_76px] gap-x-3 pb-2 font-mono text-[11px] uppercase tracking-[0.06em] lg:grid-cols-[minmax(0,1fr)_150px_80px_100px] lg:gap-x-4">
              <span />
              <span className="hidden lg:block" />
              <span className="text-right">Fund</span>
              <span className="text-right">Benchmark</span>
            </div>
            {ex.funds.map((f) => (
              <FundRow key={f.scheme_code} name={f.stressed ? `${f.fund_name} (simulated)` : f.fund_name} status={f.status}
                fund1w={f.ret_1w == null ? null : String(f.ret_1w)} bench1w={f.bench_1w == null ? null : String(f.bench_1w)}
                summary={f.summary ?? "A written summary is not available for this fund."} />
            ))}
            <div className="border-t l-line" />
          </section>
          <p className="l-faint mt-10 text-xs leading-relaxed">
            Built on {longDate(ex.built_at)} by scripts/build-example.ts. Opening this page does not call Gemini.
          </p>
        </div>
      </div>
    </div>
  );
}
