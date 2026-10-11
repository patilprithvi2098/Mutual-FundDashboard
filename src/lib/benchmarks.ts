export type Benchmark = { name: string; symbol: string };

export const INDICES: Record<string, Benchmark> = {
  nifty50: { name: "Nifty 50", symbol: "^NSEI" },
  mid150: { name: "Nifty Midcap 150", symbol: "NIFTYMIDCAP150.NS" },
  small250: { name: "Nifty Smallcap 250", symbol: "NIFTYSMLCAP250.NS" },
  nifty500: { name: "Nifty 500", symbol: "^CRSLDX" },
  nasdaq100: { name: "Nasdaq 100", symbol: "^NDX" },
  sp500: { name: "S&P 500", symbol: "^GSPC" },
};

export const isDebt = (category: string) => /debt|gilt|liquid|duration|money market|bond|overnight|credit|floater|banking and psu/i.test(category);

/** Maps a SEBI category / fund name to its stated benchmark index. Debt returns null: no free public index feed. */
export function benchmarkFor(category: string, name: string): Benchmark | null {
  if (isDebt(category)) return null;
  if (/overseas/i.test(category)) return /nasdaq/i.test(name) ? INDICES.nasdaq100 : INDICES.sp500;
  if (/small cap/i.test(category) || /smallcap/i.test(name)) return INDICES.small250;
  if (/large & mid|large and mid/i.test(category)) return INDICES.nifty500;
  if (/mid cap/i.test(category) || /midcap/i.test(name)) return INDICES.mid150;
  if (/large cap/i.test(category) || /nifty 50\b|sensex/i.test(name)) return INDICES.nifty50;
  return INDICES.nifty500;
}
