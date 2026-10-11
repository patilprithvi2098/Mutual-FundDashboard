import { q } from "./db";

export type Snapshot = {
  week_ending: string; scheme_code: number; fund_name: string; category: string; benchmark_name: string | null; as_of: string; nav: string;
  ret_1w: string | null; ret_1m: string | null; ret_ytd: string | null;
  bench_1w: string | null; bench_1m: string | null; bench_ytd: string | null;
  cat_1w: string | null; cat_1m: string | null; cat_ytd: string | null; peer_count: number;
  status: "ok" | "watch" | "review"; driver: string; summary: string;
};
export type Report = {
  week_ending: string; generated_at: string; assessment: string; reason: string; market_summary: string | null;
  market: { index: string; w: number | null; m: number | null; ytd: number | null }[]; headlines: { title: string; source: string; published: string }[];
  model: string | null; ai_used: boolean;
};

export async function latestReport() {
  const [r] = await q<Report>(`select week_ending::text, generated_at::text, assessment, reason, market_summary, market, headlines, model, ai_used from reports order by week_ending desc limit 1`);
  if (!r) return null;
  const snaps = await q<Snapshot>(`select week_ending::text, scheme_code, fund_name, category, benchmark_name, as_of::text, nav::text, ret_1w::text, ret_1m::text, ret_ytd::text,
    bench_1w::text, bench_1m::text, bench_ytd::text, cat_1w::text, cat_1m::text, cat_ytd::text, peer_count, status, driver, summary
    from weekly_snapshots where week_ending=$1 order by scheme_code`, [r.week_ending]);
  return { report: r, snaps };
}

export async function history() {
  return q<Snapshot>(`select week_ending::text, scheme_code, fund_name, category, benchmark_name, as_of::text, nav::text, ret_1w::text, ret_1m::text, ret_ytd::text,
    bench_1w::text, bench_1m::text, bench_ytd::text, cat_1w::text, cat_1m::text, cat_ytd::text, peer_count, status, driver, summary
    from weekly_snapshots order by week_ending, scheme_code`);
}
export async function reportsList() {
  return q<{ week_ending: string; assessment: string }>(`select week_ending::text, assessment from reports order by week_ending`);
}
export async function navTail(code: number, days = 120) {
  const rows = await q<{ nav: string }>(`select nav::text from nav_history where scheme_code=$1 order by nav_date desc limit $2`, [code, days]);
  return rows.map((r) => Number(r.nav)).reverse();
}
