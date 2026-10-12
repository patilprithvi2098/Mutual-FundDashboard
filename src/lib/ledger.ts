export const VERDICTS = ["No action needed", "One fund worth watching", "Consider reviewing your allocation"] as const;

export const STATUS: Record<string, { word: string; cls: string }> = {
  ok: { word: "On track", cls: "l-ok" },
  watch: { word: "Worth watching", cls: "l-watch" },
  review: { word: "Review", cls: "l-review" },
};

export function pct(v: string | number | null | undefined) {
  if (v == null) return "n/a";
  const n = Math.round(Number(v) * 10) / 10;
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;
}

const d = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
export const longDate = (iso: string) => d(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export const shortDate = (iso: string) =>
  d(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();

export function marketParagraph(summary: string | null, market: { index: string; w: number | null }[]) {
  if (summary) return summary;
  return market
    .filter((m) => m.w != null)
    .map((m) => `The ${m.index} ${m.w! >= 0 ? "rose" : "fell"} ${Math.abs(m.w!).toFixed(1)} percent this week.`)
    .join(" ");
}
