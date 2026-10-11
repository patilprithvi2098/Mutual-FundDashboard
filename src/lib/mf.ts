import { parseDMY } from "./dates";
import { benchmarkFor } from "./benchmarks";

const BASE = "https://api.mfapi.in/mf";

export type SchemeMeta = {
  scheme_code: number; scheme_name: string; fund_house: string; scheme_category: string;
};
export type Scheme = { meta: SchemeMeta; nav: { date: string; nav: number }[] };

export async function fetchScheme(code: number): Promise<Scheme> {
  const res = await fetch(`${BASE}/${code}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`mfapi ${code}: HTTP ${res.status}`);
  const j = await res.json();
  if (j.status === "ERROR" || !j.meta || !Array.isArray(j.data) || !j.data.length)
    throw new Error(`Scheme ${code} not found or has no NAV data`);
  const nav = (j.data as { date: string; nav: string }[])
    .map((d) => ({ date: parseDMY(d.date), nav: Number(d.nav) }))
    .filter((d) => d.nav > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  return { meta: j.meta, nav };
}

export async function searchSchemes(query: string): Promise<{ schemeCode: number; schemeName: string }[]> {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  return res.ok ? res.json() : [];
}

const isDirectGrowth = (n: string) => /direct/i.test(n) && /growth/i.test(n) && !/idcw|dividend|bonus|payout/i.test(n);

let listCache: { schemeCode: number; schemeName: string }[] | null = null;
async function allSchemes() {
  if (listCache) return listCache;
  const res = await fetch(`${BASE}?limit=50000`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`mfapi list: HTTP ${res.status}`);
  return (listCache = await res.json());
}

/** Name pattern that identifies true peers (mfapi has no category listing endpoint). */
function peerPattern(category: string, name: string): RegExp {
  if (/nasdaq/i.test(name)) return /nasdaq/i;
  if (/overseas/i.test(category)) return /(us |global|international|world|overseas).*(fof|fund of fund|feeder)|(fof|fund of fund|feeder).*(us|global|world)/i;
  const idx = name.match(/(nifty\s*\d+|sensex)\s+index/i);
  if (idx) return new RegExp(idx[1].replace(/\s+/g, "\\s*") + "\\s+index", "i");
  if (/small\s?cap/i.test(category)) return /small\s?cap/i;
  if (/mid\s?cap/i.test(category) && !/large/i.test(category)) return /(?<!large (&|and) )mid\s?cap/i;
  if (/short (term|duration)/i.test(category + name)) return /short (term|duration)/i;
  const tail = (category.split(" - ").pop() ?? category).replace(/fund$/i, "").trim();
  return new RegExp(tail.replace(/[^a-z0-9 ]/gi, ".?").replace(/\s+/g, "\\s*"), "i");
}

const EXCLUDE = /idcw|dividend|bonus|payout|segregated|gilt|ultra|etf|regular|low duration/i;

/** Up to `limit` live Direct-Growth peers, spread across fund houses. */
export async function discoverPeers(category: string, name: string, selfCode: number, limit = 8) {
  const pat = peerPattern(category, name);
  const wantsNext = /next 50/i.test(name);
  const cands = (await allSchemes()).filter(
    (c: { schemeCode: number; schemeName: string }) =>
      c.schemeCode !== selfCode && pat.test(c.schemeName) && /direct/i.test(c.schemeName) && /growth/i.test(c.schemeName) &&
      !EXCLUDE.test(c.schemeName) && (wantsNext || !/next/i.test(c.schemeName)),
  );
  const step = Math.max(1, Math.floor(cands.length / (limit * 2)));
  const out: { code: number; name: string }[] = [];
  for (let i = 0; i < cands.length && out.length < limit; i += step) {
    const c = cands[i];
    try {
      const r = await fetch(`${BASE}/${c.schemeCode}/latest`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const j = await r.json();
      const d: string | undefined = j?.data?.[0]?.date;
      if (d && Date.now() - new Date(parseDMY(d)).getTime() < 14 * 864e5) out.push({ code: c.schemeCode, name: j.meta.scheme_name });
    } catch { /* skip peer */ }
  }
  return out;
}

export function describeFund(meta: SchemeMeta) {
  const b = benchmarkFor(meta.scheme_category, meta.scheme_name);
  return {
    name: meta.scheme_name, fund_house: meta.fund_house, category: meta.scheme_category,
    benchmark_name: b?.name ?? null, benchmark_symbol: b?.symbol ?? null,
  };
}
