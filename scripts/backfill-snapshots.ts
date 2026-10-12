/**
 * Backfills weekly_snapshots from the NAV and index history already in the database.
 * Safe to re-run: rows written here have summary = null, so a re-run refreshes only those rows.
 * Snapshots created by a real report (summary is not null) are never touched.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-snapshots.ts [--weeks=12] [--dry-run] [--ingest]
 */
import { q, pool } from "../src/lib/db";
import { activeFunds, ingestAll, judge, seedIfEmpty, type Status } from "../src/lib/pipeline";
import { computeReturns, meanReturns, valueOnOrBefore, type Point, type Returns } from "../src/lib/returns";
import { isDebt } from "../src/lib/benchmarks";
import { addDays, todayIST, weekEnding } from "../src/lib/dates";

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}`))?.split("=")[1] ?? (process.argv.includes(`--${k}`) ? "1" : undefined);
const WEEKS = Math.min(12, Math.max(1, Number(arg("weeks") ?? 12)));
const DRY = !!arg("dry-run");
const f1 = (n: number | null | undefined) => (n == null ? null : Math.round(n * 100) / 100);

const navCache = new Map<number, Point[]>();
async function nav(code: number) {
  if (!navCache.has(code)) {
    const r = await q<{ d: string; nav: string }>(`select nav_date::text d, nav from nav_history where scheme_code=$1 order by nav_date`, [code]);
    navCache.set(code, r.map((x) => ({ date: x.d, value: Number(x.nav) })));
  }
  return navCache.get(code)!;
}
const idxCache = new Map<string, Point[]>();
async function idx(sym: string) {
  if (!idxCache.has(sym)) {
    const r = await q<{ d: string; c: string }>(`select close_date::text d, close c from index_history where symbol=$1 order by close_date`, [sym]);
    idxCache.set(sym, r.map((x) => ({ date: x.d, value: Number(x.c) })));
  }
  return idxCache.get(sym)!;
}

async function main() {
  await seedIfEmpty();
  if (arg("ingest")) console.log("Ingest:", JSON.stringify(await ingestAll()));
  const funds = await activeFunds();
  const current = weekEnding(todayIST());
  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(current, -7 * (WEEKS - i)));

  const existing = await q<{ week_ending: string; scheme_code: number; status: Status; summary: string | null }>(
    `select week_ending::text, scheme_code, status, summary from weekly_snapshots`);
  const real = new Set(existing.filter((e) => e.summary != null).map((e) => `${e.week_ending}|${e.scheme_code}`));
  const statusHistory = new Map<number, { week: string; status: Status }[]>();
  existing.forEach((e) => (statusHistory.get(e.scheme_code) ?? statusHistory.set(e.scheme_code, []).get(e.scheme_code)!).push({ week: e.week_ending, status: e.status }));

  let written = 0, keptReal = 0, skippedThin = 0;
  for (const f of funds) {
    const peers = await q<{ scheme_code: number }>(`select scheme_code from category_peers where category=$1`, [f.category]);
    if (!peers.length) console.warn(`  ! ${f.name}: no category peers stored. Run with --ingest to fetch them.`);
    if (!f.benchmark_symbol && !isDebt(f.category)) console.warn(`  ! ${f.name}: no benchmark symbol.`);
    const fundSeries = await nav(f.scheme_code);
    const benchSeries = f.benchmark_symbol ? await idx(f.benchmark_symbol) : null;
    const peerSeries = await Promise.all(peers.map((p) => nav(p.scheme_code)));
    let n = 0;
    for (const week of weeks) {
      const key = `${week}|${f.scheme_code}`;
      if (real.has(key)) { keptReal++; continue; }
      const fr = computeReturns(fundSeries, week);
      if (!fr || fr.w == null || fr.m == null) { skippedThin++; continue; }
      const br = benchSeries ? computeReturns(benchSeries, fr.asOf) : null;
      const cr = meanReturns(peerSeries.map((s) => computeReturns(s, fr.asOf)));
      const j = judge(fr, br, cr, isDebt(f.category));
      const hist = (statusHistory.get(f.scheme_code) ?? []).filter((h) => h.week < week).sort((a, b) => b.week.localeCompare(a.week)).slice(0, 2);
      const status: Status = j.status === "watch" && hist.length === 2 && hist.every((h) => h.status !== "ok") ? "review" : j.status;
      const navNow = valueOnOrBefore(fundSeries, week)!.value;
      if (!DRY) {
        await q(
          `insert into weekly_snapshots(week_ending,scheme_code,fund_name,category,benchmark_name,as_of,nav,ret_1w,ret_1m,ret_ytd,
             bench_1w,bench_1m,bench_ytd,cat_1w,cat_1m,cat_ytd,peer_count,status,driver,summary)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,null)
           on conflict (week_ending,scheme_code) do update set fund_name=excluded.fund_name, category=excluded.category,
             benchmark_name=excluded.benchmark_name, as_of=excluded.as_of, nav=excluded.nav, ret_1w=excluded.ret_1w, ret_1m=excluded.ret_1m,
             ret_ytd=excluded.ret_ytd, bench_1w=excluded.bench_1w, bench_1m=excluded.bench_1m, bench_ytd=excluded.bench_ytd,
             cat_1w=excluded.cat_1w, cat_1m=excluded.cat_1m, cat_ytd=excluded.cat_ytd, peer_count=excluded.peer_count,
             status=excluded.status, driver=excluded.driver
           where weekly_snapshots.summary is null`,
          [week, f.scheme_code, f.name, f.category, f.benchmark_name, fr.asOf, navNow, f1(fr.w), f1(fr.m), f1(fr.ytd),
            f1(br?.w), f1(br?.m), f1(br?.ytd), f1(cr?.w), f1(cr?.m), f1(cr?.ytd), peerSeries.length, status, j.driver]);
      }
      const h = statusHistory.get(f.scheme_code) ?? [];
      h.push({ week, status }); statusHistory.set(f.scheme_code, h);
      n++; written++;
    }
    console.log(`${DRY ? "[dry run] " : ""}${f.name}: ${n} weeks written`);
  }
  console.log(`\nDone. written=${written} keptRealSnapshots=${keptReal} skippedForThinHistory=${skippedThin}`);
  const rows = await q<{ scheme_code: number; n: string; first: string; last: string }>(
    `select scheme_code, count(*) n, min(week_ending)::text first, max(week_ending)::text last from weekly_snapshots group by 1 order by 1`);
  console.table(rows);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool().end());
