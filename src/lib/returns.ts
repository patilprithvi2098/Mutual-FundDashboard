import { addDays, addMonths } from "./dates";

export type Point = { date: string; value: number };
export type Returns = { asOf: string; w: number | null; m: number | null; ytd: number | null };

/** series must be sorted ascending by date */
export function valueOnOrBefore(s: Point[], date: string): Point | null {
  for (let i = s.length - 1; i >= 0; i--) if (s[i].date <= date) return s[i];
  return null;
}
const pct = (end: number, base?: Point | null) => (base && base.value ? (end / base.value - 1) * 100 : null);

export function computeReturns(s: Point[], asOf?: string): Returns | null {
  if (!s.length) return null;
  const end = asOf ? valueOnOrBefore(s, asOf) : s[s.length - 1];
  if (!end) return null;
  const ref = end.date;
  return {
    asOf: ref,
    w: pct(end.value, valueOnOrBefore(s, addDays(ref, -7))),
    m: pct(end.value, valueOnOrBefore(s, addMonths(ref, -1))),
    ytd: pct(end.value, valueOnOrBefore(s, `${Number(ref.slice(0, 4)) - 1}-12-31`)),
  };
}

export function meanReturns(list: (Returns | null)[]): Returns | null {
  const ok = list.filter((r): r is Returns => !!r);
  if (!ok.length) return null;
  const avg = (k: "w" | "m" | "ytd") => {
    const v = ok.map((r) => r[k]).filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  return { asOf: ok[0].asOf, w: avg("w"), m: avg("m"), ytd: avg("ytd") };
}
