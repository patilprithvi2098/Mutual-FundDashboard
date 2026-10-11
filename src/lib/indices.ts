import { iso } from "./dates";
import type { Point } from "./returns";

export async function fetchIndex(symbol: string): Promise<Point[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d`;
  const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Yahoo ${symbol}: HTTP ${res.status}`);
  const r = (await res.json())?.chart?.result?.[0];
  if (!r?.timestamp) throw new Error(`Yahoo ${symbol}: no data`);
  const off = r.meta?.gmtoffset ?? 0;
  const closes: (number | null)[] = r.indicators.quote[0].close;
  const out: Point[] = [];
  r.timestamp.forEach((t: number, i: number) => {
    const c = closes[i];
    if (c != null) out.push({ date: iso(new Date((t + off) * 1000)), value: c });
  });
  return out;
}
