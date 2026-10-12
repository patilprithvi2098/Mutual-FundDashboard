/**
 * Builds the "What a warning looks like" example shown at /example.
 *
 * Takes this week's real snapshot, lowers one equity fund's returns so it trails its benchmark by
 * more than the 2-point watch threshold, then runs the real rules (judge) and the real Gemini prompt
 * (writeNarrative) on it. The result is saved to the example_report table, so viewing the page never
 * calls Gemini. Run it again to refresh the example after a new weekly report.
 *
 *   npm run build-example
 */
import { q, pool } from "../src/lib/db";
import { judge, type Status } from "../src/lib/pipeline";
import { writeNarrative, GEMINI_MODEL } from "../src/lib/gemini";
import { latestReport, type Snapshot } from "../src/lib/queries";
import { isDebt } from "../src/lib/benchmarks";
import type { Returns } from "../src/lib/returns";

/** How far the example fund is pushed below its benchmark, in percentage points. */
const SHIFT = { w: 1.6, m: 3.2, ytd: 4.1 };
const PREFERRED = 118989; // HDFC Mid Cap, if it is in the portfolio

const num = (v: string | null) => (v == null ? null : Number(v));
const r2 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);
const ret = (w: number | null, m: number | null, ytd: number | null, asOf: string): Returns => ({ asOf, w, m, ytd });

async function main() {
  const data = await latestReport();
  if (!data) throw new Error("No weekly report yet. Generate one first.");
  const { report, snaps } = data;
  const target = snaps.find((s) => s.scheme_code === PREFERRED && s.bench_1m != null)
    ?? snaps.find((s) => !isDebt(s.category) && s.bench_1m != null);
  if (!target) throw new Error("No equity fund with a benchmark to use for the example.");

  // Same snapshot, with the target fund placed below its benchmark.
  const rows = snaps.map((s) => {
    const stressed = s.scheme_code === target.scheme_code;
    const fw = stressed ? num(s.bench_1w)! - SHIFT.w : num(s.ret_1w);
    const fm = stressed ? num(s.bench_1m)! - SHIFT.m : num(s.ret_1m);
    const fy = stressed ? num(s.bench_ytd)! - SHIFT.ytd : num(s.ret_ytd);
    const fr = ret(fw, fm, fy, s.as_of);
    const br = s.bench_1m == null ? null : ret(num(s.bench_1w), num(s.bench_1m), num(s.bench_ytd), s.as_of);
    const cr = s.cat_1m == null ? null : ret(num(s.cat_1w), num(s.cat_1m), num(s.cat_ytd), s.as_of);
    const j = judge(fr, br, cr, isDebt(s.category));
    return { s, fr, br, cr, status: j.status as Status, driver: j.driver, stressed };
  });

  // Same verdict rule as the weekly report.
  const watches = rows.filter((r) => r.status === "watch").length;
  const reviews = rows.filter((r) => r.status === "review").length;
  const assessment = reviews > 0 || watches >= 2 ? "Consider reviewing your allocation" : watches === 1 ? "One fund worth watching" : "No action needed";

  // Same payload shape the weekly report sends to Gemini.
  const payload = {
    week_ending: report.week_ending, assessment_decided_by_rules: assessment, market_this_week_percent: report.market,
    headlines: report.headlines.map((h) => `${h.title} (${h.source}, ${h.published})`),
    funds: rows.map((r) => ({
      scheme_code: r.s.scheme_code, name: r.s.fund_name, category: r.s.category,
      status: r.status, week_vs_benchmark: r.driver,
      fund_returns_percent: { w: r2(r.fr.w), m: r2(r.fr.m), ytd: r2(r.fr.ytd) }, benchmark: r.s.benchmark_name,
      benchmark_returns_percent: r.br ? { w: r2(r.br.w), m: r2(r.br.m), ytd: r2(r.br.ytd) } : null,
      category_average_returns_percent: r.cr ? { w: r2(r.cr.w), m: r2(r.cr.m), ytd: r2(r.cr.ytd) } : null,
      peers_in_category_average: r.s.peer_count,
    })),
  };
  const narrative = await writeNarrative(payload);
  const byCode = new Map(narrative.funds.map((f) => [f.scheme_code, f.summary]));

  const example = {
    built_at: new Date().toISOString(), model: GEMINI_MODEL, based_on_week: report.week_ending,
    stressed_fund: target.fund_name, shift: SHIFT, assessment, reason: narrative.portfolio_reason, market_summary: narrative.market_summary,
    funds: rows.map((r) => ({
      scheme_code: r.s.scheme_code, fund_name: r.s.fund_name, status: r.status, stressed: r.stressed,
      ret_1w: r2(r.fr.w), bench_1w: r2(r.br?.w ?? null), summary: byCode.get(r.s.scheme_code) ?? (r.s as Snapshot).summary,
    })),
  };
  await q(`create table if not exists example_report(id int primary key default 1 check (id = 1), data jsonb not null, built_at timestamptz not null default now())`);
  await q(`alter table example_report enable row level security`);
  await q(`insert into example_report(id, data, built_at) values(1, $1, now()) on conflict (id) do update set data=excluded.data, built_at=now()`, [JSON.stringify(example)]);
  console.log(`Example built from week ${report.week_ending}: ${target.fund_name} pushed ${SHIFT.m} points below its benchmark over the month.`);
  console.log(`Verdict: ${assessment}`);
  console.log(`Reason: ${narrative.portfolio_reason}`);
  console.log(`Fund summary: ${byCode.get(target.scheme_code)}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool().end());
