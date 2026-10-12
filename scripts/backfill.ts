/**
 * Backfills weekly snapshots from stored NAV and index history. Idempotent: weeks are upserted,
 * and any week that already holds a real (non-backfill) report is left alone.
 *
 *   npm run backfill -- --weeks 10        (8 to 12 weeks, default 10)
 *   npm run backfill -- --dry-run
 *
 * Needs DATABASE_URL (loaded from .env.local by the npm script).
 */
import { pool, q } from "../src/lib/db";
import { computeReturns, meanReturns, valueOnOrBefore, type Point, type Returns } from "../src/lib/returns";
import { INDICES, isDebt } from "../src/lib/benchmarks";
import { addDays, todayIST, weekEnding } from "../src/lib/dates";

const MARKER = "backfill";
type Status = "ok" | "watch" | "review";
type Fund = { scheme_code: number; name: string; category: string; benchmark_name: string | null; benchmark_symbol: string | null };

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const wi = args.indexOf("--weeks");
const weeks = wi >= 0 ? Number(args[wi + 1]) : 10;
if (!Number.isInteger(weeks) || weeks < 8 || weeks > 12) throw new Error("--weeks must be an integer from 8 to 12");

const f1 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);
const rnd = (r: Returns | null) => (r ? { w: f1(r.w), m: f1(r.m), ytd: f1(r.ytd) } : null);
const pctText = (n: number | null) => (n == null ? "n/a" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`);

// Same thresholds and logic as judge() in src/lib/pipeline.ts, copied so that file stays untouched.
function judge(fund: Returns, bench: Returns | null, cat: Returns | null, debt: boolean) {
  const k = debt ? 0.15 : 1;
  const diffs = [bench, cat].map((x) => (x && fund.m != null && x.m != null ? fund.m - x.m : null)).filter((x): x is number => x != null);
  const worst = diffs.length ? Math.min(...diffs) : null;
  const status: Status = worst != null && worst <= -2 * k ? "watch" : "ok";
  const ref = bench ?? cat;
  const wk = ref && fund.w != null && ref.w != null ? fund.w - ref.w : null;
  let driver = "in-line";
  if (wk != null && fund.w != null && ref?.w != null) {
    if (wk <= -1 * k) driver = "fund-specific";
    else if (wk >= 1 * k) driver = "outperforming";
    else if (ref.w < 0 || fund.w < 0) driver = "market-wide";
  }
  return { status, driver };
}

const navCache = new Map<number, Point[]>();
async function navSeries(code: number) {
  if (!navCache.has(code)) {
    const rows = await q<{ d: string; nav: string }>(`select nav_date::text d, nav from nav_history where scheme_code=$1 order by nav_date`, [code]);
    navCache.set(code, rows.map((r) => ({ date: r.d, value: Number(r.nav) })));
  }
  return navCache.get(code)!;
}
const idxCache = new Map<string, Point[]>();
async function indexSeries(sym: string) {
  if (!idxCache.has(sym)) {
    const rows = await q<{ d: string; c: string }>(`select close_date::text d, close c from index_history where symbol=$1 order by close_date`, [sym]);
    idxCache.set(sym, rows.map((r) => ({ date: r.d, value: Number(r.c) })));
  }
  return idxCache.get(sym)!;
}

async function main() {
  const funds = await q<Fund>(`select scheme_code, name, category, benchmark_name, benchmark_symbol from funds where active order by added_at, scheme_code`);
  if (!funds.length) throw new Error("No active funds. Open the app once to seed them, then re-run.");
  const current = weekEnding(todayIST());
  // Oldest first so the 3-week "review" streak can build on earlier backfilled weeks.
  const labels = Array.from({ length: weeks }, (_, i) => addDays(current, -7 * (weeks - i)));
  console.log(`Backfilling ${weeks} weeks (${labels[0]} to ${labels.at(-1)}) for ${funds.length} funds${dryRun ? " [dry run]" : ""}`);

  const peers = new Map<string, number[]>();
  for (const c of new Set(funds.map((f) => f.category)))
    peers.set(c, (await q<{ scheme_code: number }>(`select scheme_code from category_peers where category=$1`, [c])).map((p) => p.scheme_code));

  for (const week of labels) {
    const [existing] = await q<{ model: string | null }>(`select model from reports where week_ending=$1`, [week]);
    if (existing && existing.model !== MARKER) { console.log(`${week}  skipped (real report exists)`); continue; }
    const asOf = addDays(week, -1); // the Friday before the Saturday label

    type Row = { f: Fund; fr: Returns; br: Returns | null; cr: Returns | null; peerCount: number; nav: number; status: Status; driver: string };
    const rows: Row[] = [];
    for (const f of funds) {
      const series = await navSeries(f.scheme_code);
      const fr = computeReturns(series, asOf);
      const end = valueOnOrBefore(series, asOf);
      if (!fr || !end) continue;
      const br = f.benchmark_symbol ? computeReturns(await indexSeries(f.benchmark_symbol), fr.asOf) : null;
      const peerRets = await Promise.all((peers.get(f.category) ?? []).map(async (c) => computeReturns(await navSeries(c), fr.asOf)));
      const cr = meanReturns(peerRets);
      const j = judge(fr, br, cr, isDebt(f.category));
      const prev = await q<{ status: string }>(`select status from weekly_snapshots where scheme_code=$1 and week_ending<$2 order by week_ending desc limit 2`, [f.scheme_code, week]);
      const status: Status = j.status === "watch" && prev.length === 2 && prev.every((p) => p.status !== "ok") ? "review" : j.status;
      rows.push({ f, fr, br, cr, peerCount: peerRets.filter(Boolean).length, nav: end.value, status, driver: j.driver });
    }
    if (!rows.length) { console.log(`${week}  skipped (no NAV history that far back)`); continue; }

    const reviews = rows.filter((r) => r.status === "review").length;
    const watches = rows.filter((r) => r.status === "watch").length;
    const assessment = reviews > 0 || watches >= 2 ? "Consider reviewing your allocation" : watches === 1 ? "One fund worth watching" : "No action needed";
    const market = await Promise.all([INDICES.nifty50, INDICES.mid150, INDICES.small250].map(async (b) => {
      const r = computeReturns(await indexSeries(b.symbol), asOf);
      return { index: b.name, ...rnd(r), as_of: r?.asOf };
    }));
    console.log(`${week}  as of ${asOf}  ${assessment}  (${watches} watch, ${reviews} review, ${rows.length} funds)`);
    if (dryRun) continue;

    const client = await pool().connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into reports(week_ending,generated_at,assessment,reason,market_summary,market,headlines,model,ai_used)
         values($1,now(),$2,$3,null,$4,'[]',$5,false)
         on conflict (week_ending) do update set generated_at=now(), assessment=excluded.assessment, reason=excluded.reason,
           market=excluded.market, headlines=excluded.headlines, model=excluded.model, ai_used=false`,
        [week, assessment, `Backfilled from stored NAV and index history, with no AI commentary: ${watches + reviews} of ${rows.length} funds were trailing their benchmark or category.`, JSON.stringify(market), MARKER]);
      for (const r of rows) {
        const summary = `${r.f.name} returned ${pctText(r.fr.w)} for the week and ${pctText(r.fr.m)} over the month. ` +
          `${r.br ? `Its benchmark, ${r.f.benchmark_name}, returned ${pctText(r.br.m)} over the month` : "No benchmark index is available for this fund"}${r.cr ? ` and similar funds averaged ${pctText(r.cr.m)}` : ""}. ` +
          `Backfilled from stored history; that week it looked ${r.driver.replace("-", " ")}.`;
        await client.query(
          `insert into weekly_snapshots(week_ending,scheme_code,fund_name,category,benchmark_name,as_of,nav,ret_1w,ret_1m,ret_ytd,
             bench_1w,bench_1m,bench_ytd,cat_1w,cat_1m,cat_ytd,peer_count,status,driver,summary)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
           on conflict (week_ending,scheme_code) do update set fund_name=excluded.fund_name, category=excluded.category,
             benchmark_name=excluded.benchmark_name, as_of=excluded.as_of, nav=excluded.nav, ret_1w=excluded.ret_1w, ret_1m=excluded.ret_1m,
             ret_ytd=excluded.ret_ytd, bench_1w=excluded.bench_1w, bench_1m=excluded.bench_1m, bench_ytd=excluded.bench_ytd,
             cat_1w=excluded.cat_1w, cat_1m=excluded.cat_1m, cat_ytd=excluded.cat_ytd, peer_count=excluded.peer_count,
             status=excluded.status, driver=excluded.driver, summary=excluded.summary`,
          [week, r.f.scheme_code, r.f.name, r.f.category, r.f.benchmark_name, r.fr.asOf, r.nav, f1(r.fr.w), f1(r.fr.m), f1(r.fr.ytd),
            f1(r.br?.w ?? null), f1(r.br?.m ?? null), f1(r.br?.ytd ?? null), f1(r.cr?.w ?? null), f1(r.cr?.m ?? null), f1(r.cr?.ytd ?? null),
            r.peerCount, r.status, r.driver, summary]);
      }
      await client.query("commit");
    } catch (e) { await client.query("rollback"); throw e; } finally { client.release(); }
  }
  await pool().end();
}

main().catch(async (e) => { console.error(e); await pool().end().catch(() => undefined); process.exit(1); });
