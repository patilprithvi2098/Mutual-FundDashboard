import { q } from "./db";
import { addDays, addMonths } from "./dates";
import { valueOnOrBefore, type Point } from "./returns";
import { activeFunds } from "./pipeline";
import { listSips } from "./goals";
export { shortName, plainCategory, initials } from "./names";

/**
 * Sample portfolio. Meera's real holdings are not connected, so the value shown is simulated:
 * each fund's sample monthly SIP (fund_sips) is bought on the first NAV date of every month,
 * starting with the first month of stored NAV history, at the real NAV of that day.
 */
export type ValuePt = { d: string; value: number; invested: number };
export type Holding = { scheme_code: number; units: number; invested: number; value: number; nav: number; navDate: string };

export async function navSeries(codes: number[]) {
  const out = new Map<number, Point[]>(codes.map((c) => [c, []]));
  if (!codes.length) return out;
  const rows = await q<{ c: number; d: string; v: string }>(
    `select scheme_code c, nav_date::text d, nav::text v from nav_history where scheme_code = any($1::int[]) order by nav_date`, [codes]);
  for (const r of rows) out.get(r.c)?.push({ date: r.d, value: Number(r.v) });
  return out;
}

export async function indexSeries(symbol: string): Promise<Point[]> {
  const rows = await q<{ d: string; v: string }>(`select close_date::text d, close::text v from index_history where symbol=$1 order by close_date`, [symbol]);
  return rows.map((r) => ({ date: r.d, value: Number(r.v) }));
}

export function simulateSips(navs: Map<number, Point[]>, sipByCode: Record<number, number>) {
  const dates = [...new Set([...navs.values()].flatMap((s) => s.map((p) => p.date)))].sort();
  const state = [...navs.entries()].map(([code, s]) => ({ code, s, i: -1, units: 0, invested: 0, month: "" }));
  const series: ValuePt[] = [];
  for (const d of dates) {
    let value = 0, invested = 0;
    for (const f of state) {
      while (f.i + 1 < f.s.length && f.s[f.i + 1].date <= d) {
        f.i++;
        const p = f.s[f.i], m = p.date.slice(0, 7), amt = sipByCode[f.code] ?? 0;
        if (m !== f.month) { f.month = m; if (amt > 0) { f.units += amt / p.value; f.invested += amt; } }
      }
      if (f.i >= 0) { value += f.units * f.s[f.i].value; invested += f.invested; }
    }
    series.push({ d, value, invested });
  }
  const holdings: Holding[] = state.map((f) => {
    const last = f.s[f.s.length - 1];
    return { scheme_code: f.code, units: f.units, invested: f.invested, value: last ? f.units * last.value : 0, nav: last?.value ?? 0, navDate: last?.date ?? "" };
  });
  return { series, holdings, start: series[0]?.d ?? null };
}

/** Percentage change over a window ending at the last point. */
export function changeSince(s: Point[], from: string) {
  const end = s[s.length - 1], base = valueOnOrBefore(s, from);
  return end && base && base.value ? (end.value / base.value - 1) * 100 : null;
}
export type Grid = { w: number | null; m: number | null; m3: number | null; ytd: number | null; y1: number | null };
export function returnsGrid(s: Point[], asOf?: string): Grid {
  const cut = asOf ? s.filter((p) => p.date <= asOf) : s;
  const end = cut[cut.length - 1];
  if (!end) return { w: null, m: null, m3: null, ytd: null, y1: null };
  const ref = end.date;
  return {
    w: changeSince(cut, addDays(ref, -7)),
    m: changeSince(cut, addMonths(ref, -1)),
    m3: changeSince(cut, addMonths(ref, -3)),
    ytd: changeSince(cut, `${Number(ref.slice(0, 4)) - 1}-12-31`),
    y1: changeSince(cut, addMonths(ref, -12)),
  };
}

/** Consecutive latest weeks a fund finished ahead of (or behind) its yardstick, plus the totals. */
export function streak(weeks: { fund: number | null; yard: number | null }[]) {
  const cmp = weeks.map((w) => (w.fund == null || w.yard == null ? null : w.fund >= w.yard ? "ahead" : "behind"));
  const known = cmp.filter((c): c is "ahead" | "behind" => c != null);
  const last = [...cmp].reverse().find((c) => c != null) ?? null;
  let run = 0;
  for (let i = cmp.length - 1; i >= 0; i--) { if (cmp[i] == null) continue; if (cmp[i] !== last) break; run++; }
  return { last, run, ahead: known.filter((c) => c === "ahead").length, total: known.length };
}

export const inr0 = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Active funds, their sample SIPs, full NAV series and the simulated holdings. */
export async function loadPortfolio() {
  const [funds, sips] = await Promise.all([activeFunds(), listSips()]);
  const sipByCode = Object.fromEntries(sips.map((s) => [s.scheme_code, s.monthly_amount]));
  const navs = await navSeries(funds.map((f) => f.scheme_code));
  return { funds, sipByCode, navs, ...simulateSips(navs, sipByCode) };
}

/** Recent closes per index symbol, for sparklines. */
export async function indexTails(symbols: string[], days = 60) {
  const out = new Map<string, number[]>(symbols.map((s) => [s, []]));
  if (!symbols.length) return out;
  const rows = await q<{ s: string; v: string }>(
    `select symbol s, close::text v from (select symbol, close, close_date, row_number() over (partition by symbol order by close_date desc) rn
       from index_history where symbol = any($1::text[])) t where rn <= $2 order by close_date`, [symbols, days]);
  for (const r of rows) out.get(r.s)?.push(Number(r.v));
  return out;
}
