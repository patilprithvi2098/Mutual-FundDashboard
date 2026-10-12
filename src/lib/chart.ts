import { q } from "./db";

export type Pt = { d: string; f: number; b: number | null };
export type ChartData = { w: Pt[]; m: Pt[]; ytd: Pt[] };

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

type Row = { d: string; v: number };
const onOrBefore = (rows: Row[], date: string) => {
  let hit: Row | null = null;
  for (const r of rows) { if (r.d <= date) hit = r; else break; }
  return hit;
};

function slice(fund: Row[], bench: Row[] | null, start: string): Pt[] {
  const f0 = onOrBefore(fund, start) ?? fund[0];
  if (!f0) return [];
  const b0 = bench ? onOrBefore(bench, start) ?? bench[0] ?? null : null;
  const pts: Pt[] = [];
  for (const r of fund) {
    if (r.d < start && r.d !== f0.d) continue;
    const b = bench && b0 ? onOrBefore(bench, r.d) : null;
    pts.push({ d: r.d, f: (r.v / f0.v) * 100, b: b && b0 ? (b.v / b0.v) * 100 : null });
  }
  return pts;
}

/** Fund and benchmark series for the three chart periods, both rebased to 100 at the period start. */
export async function chartData(code: number, symbol: string | null, asOf: string): Promise<ChartData> {
  const year = Number(asOf.slice(0, 4));
  const from = [`${year - 1}-12-15`, addDays(asOf, -45)].sort()[0];
  const fund = (await q<{ d: string; v: string }>(`select nav_date::text d, nav::text v from nav_history where scheme_code=$1 and nav_date>=$2 and nav_date<=$3 order by nav_date`, [code, from, asOf])).map((r) => ({ d: r.d, v: Number(r.v) }));
  const bench = symbol
    ? (await q<{ d: string; v: string }>(`select close_date::text d, close::text v from index_history where symbol=$1 and close_date>=$2 and close_date<=$3 order by close_date`, [symbol, from, asOf])).map((r) => ({ d: r.d, v: Number(r.v) }))
    : null;
  return {
    w: slice(fund, bench, addDays(asOf, -7)),
    m: slice(fund, bench, addDays(asOf, -30)),
    ytd: slice(fund, bench, `${year - 1}-12-31`),
  };
}
