import { q, pool, ensureSchema } from "./db";
import { fetchScheme, discoverPeers, describeFund } from "./mf";
import { fetchIndex } from "./indices";
import { weeklyHeadlines } from "./news";
import { computeReturns, meanReturns, type Point, type Returns } from "./returns";
import { writeNarrative, GEMINI_MODEL, type Narrative } from "./gemini";
import { isDebt, INDICES } from "./benchmarks";
import { todayIST, weekEnding, addDays } from "./dates";

export const SEED_CODES = [120716, 118989, 118778, 119016, 150751];

export type FundRow = {
  scheme_code: number; name: string; fund_house: string; category: string;
  benchmark_name: string | null; benchmark_symbol: string | null; active: boolean;
};

async function upsertNav(code: number, nav: { date: string; nav: number }[]) {
  const cut = addDays(todayIST(), -800);
  const rows = nav.filter((n) => n.date >= cut);
  if (!rows.length) return;
  await q(
    `insert into nav_history(scheme_code,nav_date,nav) select $1, d, n from unnest($2::date[],$3::numeric[]) as t(d,n)
     on conflict (scheme_code,nav_date) do update set nav=excluded.nav`,
    [code, rows.map((r) => r.date), rows.map((r) => r.nav)],
  );
}

export async function addFund(code: number) {
  const s = await fetchScheme(code);
  const d = describeFund(s.meta);
  await q(
    `insert into funds(scheme_code,name,fund_house,category,benchmark_name,benchmark_symbol,active)
     values($1,$2,$3,$4,$5,$6,true)
     on conflict (scheme_code) do update set active=true, name=excluded.name, category=excluded.category,
       benchmark_name=excluded.benchmark_name, benchmark_symbol=excluded.benchmark_symbol`,
    [code, d.name, d.fund_house, d.category, d.benchmark_name, d.benchmark_symbol],
  );
  await upsertNav(code, s.nav);
  return { code, ...d, latest: s.nav[s.nav.length - 1] };
}

export async function removeFund(code: number) {
  await q(`update funds set active=false where scheme_code=$1`, [code]);
}

export async function activeFunds() {
  return q<FundRow>(`select * from funds where active order by added_at, scheme_code`);
}

export async function seedIfEmpty() {
  await ensureSchema();
  const [{ n }] = await q<{ n: string }>(`select count(*) n from funds`);
  if (Number(n) > 0) return false;
  for (const c of SEED_CODES) await addFund(c).catch(() => undefined);
  return true;
}

async function mapLimit<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>) {
  const out: R[] = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

/** Daily job: refresh NAVs (funds + category peers) and benchmark index closes. */
export async function ingestAll() {
  const funds = await activeFunds();
  const errors: string[] = [];
  const peerRows: { category: string; scheme_code: number }[] = [];
  for (const f of funds) {
    let peers = await q<{ scheme_code: number }>(`select scheme_code from category_peers where category=$1`, [f.category]);
    if (!peers.length) {
      const found = await discoverPeers(f.category, f.name, f.scheme_code).catch(() => []);
      for (const p of found) await q(`insert into category_peers values($1,$2,$3) on conflict do nothing`, [f.category, p.code, p.name]);
      peers = found.map((p) => ({ scheme_code: p.code }));
    }
    peers.forEach((p) => peerRows.push({ category: f.category, scheme_code: p.scheme_code }));
  }
  const codes = [...new Set([...funds.map((f) => f.scheme_code), ...peerRows.map((p) => p.scheme_code)])];
  await mapLimit(codes, 6, async (c) => {
    try { await upsertNav(c, (await fetchScheme(c)).nav); } catch (e) { errors.push(`NAV ${c}: ${(e as Error).message}`); }
  });
  const symbols = new Set<string>([INDICES.nifty50.symbol, INDICES.mid150.symbol, INDICES.small250.symbol]);
  funds.forEach((f) => f.benchmark_symbol && symbols.add(f.benchmark_symbol));
  await mapLimit([...symbols], 4, async (sym) => {
    try {
      const pts = await fetchIndex(sym);
      await q(
        `insert into index_history(symbol,close_date,close) select $1,d,c from unnest($2::date[],$3::numeric[]) t(d,c)
         on conflict (symbol,close_date) do update set close=excluded.close`,
        [sym, pts.map((p) => p.date), pts.map((p) => p.value)],
      );
    } catch (e) { errors.push(`Index ${sym}: ${(e as Error).message}`); }
  });
  return { funds: funds.length, navSeries: codes.length, indices: symbols.size, errors };
}

async function navSeries(code: number): Promise<Point[]> {
  const rows = await q<{ nav_date: Date; nav: string }>(`select nav_date::text, nav from nav_history where scheme_code=$1 order by nav_date`, [code]);
  return rows.map((r) => ({ date: String(r.nav_date), value: Number(r.nav) }));
}
async function indexSeries(sym: string): Promise<Point[]> {
  const rows = await q<{ close_date: string; close: string }>(`select close_date::text, close from index_history where symbol=$1 order by close_date`, [sym]);
  return rows.map((r) => ({ date: r.close_date, value: Number(r.close) }));
}

type Status = "ok" | "watch" | "review";
const f1 = (n: number | null) => (n == null ? null : Math.round(n * 100) / 100);
const rnd = (r: Returns | null) => (r ? { w: f1(r.w), m: f1(r.m), ytd: f1(r.ytd) } : null);

function judge(fund: Returns, bench: Returns | null, cat: Returns | null, debt: boolean) {
  const k = debt ? 0.15 : 1;
  const diffs = [bench, cat].map((x) => (x && fund.m != null && x.m != null ? fund.m - x.m : null)).filter((x): x is number => x != null);
  const worst = diffs.length ? Math.min(...diffs) : null;
  let status: Status = worst != null && worst <= -2 * k ? "watch" : "ok";
  const ref = bench ?? cat;
  const wk = ref && fund.w != null && ref.w != null ? fund.w - ref.w : null;
  let driver = "in-line";
  if (wk != null && fund.w != null && ref?.w != null) {
    if (wk <= -1 * k) driver = "fund-specific";
    else if (wk >= 1 * k) driver = "outperforming";
    else if (ref.w < 0 || fund.w < 0) driver = "market-wide";
  }
  return { status, driver, worst };
}

export async function generateReport(opts: { skipIngest?: boolean } = {}) {
  await seedIfEmpty();
  const ingest = opts.skipIngest ? null : await ingestAll();
  const funds = await activeFunds();
  if (!funds.length) throw new Error("No funds to report on. Add a fund first.");
  const week = weekEnding(todayIST());

  const idx = await Promise.all([INDICES.nifty50, INDICES.mid150, INDICES.small250].map(async (b) => ({ ...b, ret: computeReturns(await indexSeries(b.symbol)) })));
  const market = idx.map((i) => ({ index: i.name, ...rnd(i.ret ?? null), as_of: i.ret?.asOf }));

  type Row = { f: FundRow; fr: Returns; br: Returns | null; cr: Returns | null; peerCount: number; status: Status; driver: string; worst: number | null; latestNav: number };
  const rows: Row[] = [];
  for (const f of funds) {
    const fr = computeReturns(await navSeries(f.scheme_code));
    if (!fr) continue;
    const br = f.benchmark_symbol ? computeReturns(await indexSeries(f.benchmark_symbol), fr.asOf) : null;
    const peers = await q<{ scheme_code: number }>(`select scheme_code from category_peers where category=$1`, [f.category]);
    const peerRets = await Promise.all(peers.map(async (p) => computeReturns(await navSeries(p.scheme_code), fr.asOf)));
    const cr = meanReturns(peerRets);
    const j = judge(fr, br, cr, isDebt(f.category));
    const prev = await q<{ status: string }>(
      `select status from weekly_snapshots where scheme_code=$1 and week_ending<$2 order by week_ending desc limit 2`, [f.scheme_code, week]);
    const status: Status = j.status === "watch" && prev.length === 2 && prev.every((p) => p.status !== "ok") ? "review" : j.status;
    const latestNav = (await navSeries(f.scheme_code)).at(-1)!.value;
    rows.push({ f, fr, br, cr, peerCount: peerRets.filter(Boolean).length, status, driver: j.driver, worst: j.worst, latestNav });
  }
  if (!rows.length) throw new Error("No NAV data available yet. Run the ingest first.");

  const reviews = rows.filter((r) => r.status === "review").length;
  const watches = rows.filter((r) => r.status === "watch").length;
  const assessment = reviews > 0 || watches >= 2 ? "Consider reviewing your allocation" : watches === 1 ? "One fund worth watching" : "No action needed";

  const headlines = await weeklyHeadlines().catch(() => []);
  const payload = {
    week_ending: week, assessment_decided_by_rules: assessment, market_this_week_percent: market,
    headlines: headlines.map((h) => `${h.title} (${h.source}, ${h.published})`),
    funds: rows.map((r) => ({
      scheme_code: r.f.scheme_code, name: r.f.name, category: r.f.category,
      status: r.status, week_vs_benchmark: r.driver,
      fund_returns_percent: rnd(r.fr), benchmark: r.f.benchmark_name, benchmark_returns_percent: rnd(r.br),
      category_average_returns_percent: rnd(r.cr), peers_in_category_average: r.peerCount,
    })),
  };

  let narrative: Narrative | null = null; let aiError: string | null = null;
  try { narrative = await writeNarrative(payload); } catch (e) { aiError = (e as Error).message; }
  const byCode = new Map(narrative?.funds.map((x) => [x.scheme_code, x.summary]));

  const fallback = (r: (typeof rows)[number]) => {
    const s = (n: number | null) => (n == null ? "n/a" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`);
    return `${r.f.name} returned ${s(r.fr.w)} this week and ${s(r.fr.m)} over the month. ` +
      `${r.br ? `Its benchmark, ${r.f.benchmark_name}, returned ${s(r.br.m)} over the month` : "No benchmark index is available for this fund"}${r.cr ? ` and similar funds averaged ${s(r.cr.m)}` : ""}. ` +
      `This week it looks ${r.driver.replace("-", " ")} (AI commentary unavailable right now).`;
  };

  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into reports(week_ending,generated_at,assessment,reason,market_summary,market,headlines,model,ai_used)
       values($1,now(),$2,$3,$4,$5,$6,$7,$8)
       on conflict (week_ending) do update set generated_at=now(), assessment=excluded.assessment, reason=excluded.reason,
        market_summary=excluded.market_summary, market=excluded.market, headlines=excluded.headlines, model=excluded.model, ai_used=excluded.ai_used`,
      [week, assessment, narrative?.portfolio_reason ?? `${watches + reviews} of ${rows.length} funds are trailing their benchmark or category.`,
        narrative?.market_summary ?? null, JSON.stringify(market), JSON.stringify(headlines), narrative ? GEMINI_MODEL : null, !!narrative]);
    for (const r of rows) {
      await client.query(
        `insert into weekly_snapshots(week_ending,scheme_code,fund_name,category,benchmark_name,as_of,nav,ret_1w,ret_1m,ret_ytd,
           bench_1w,bench_1m,bench_ytd,cat_1w,cat_1m,cat_ytd,peer_count,status,driver,summary)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
         on conflict (week_ending,scheme_code) do update set fund_name=excluded.fund_name, category=excluded.category,
           benchmark_name=excluded.benchmark_name, as_of=excluded.as_of, nav=excluded.nav, ret_1w=excluded.ret_1w, ret_1m=excluded.ret_1m,
           ret_ytd=excluded.ret_ytd, bench_1w=excluded.bench_1w, bench_1m=excluded.bench_1m, bench_ytd=excluded.bench_ytd,
           cat_1w=excluded.cat_1w, cat_1m=excluded.cat_1m, cat_ytd=excluded.cat_ytd, peer_count=excluded.peer_count,
           status=excluded.status, driver=excluded.driver, summary=excluded.summary, created_at=now()`,
        [week, r.f.scheme_code, r.f.name, r.f.category, r.f.benchmark_name, r.fr.asOf, r.latestNav,
          f1(r.fr.w), f1(r.fr.m), f1(r.fr.ytd), f1(r.br?.w ?? null), f1(r.br?.m ?? null), f1(r.br?.ytd ?? null),
          f1(r.cr?.w ?? null), f1(r.cr?.m ?? null), f1(r.cr?.ytd ?? null), r.peerCount, r.status, r.driver,
          byCode.get(r.f.scheme_code) ?? fallback(r)]);
    }
    await client.query("commit");
  } catch (e) { await client.query("rollback"); throw e; } finally { client.release(); }

  return { week, assessment, aiUsed: !!narrative, aiError, funds: rows.length, ingest };
}
