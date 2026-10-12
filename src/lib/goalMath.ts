/** Goal projection math and formatting. No database access, so client components can import it. */

/** Assumed annual return range for goal projections. Shown on screen wherever a projection appears. */
export const RATE_LOW = 0.08;
export const RATE_HIGH = 0.12;
export type Goal = {
  id: number; name: string; target_amount: number; target_date: string;
  saved_amount: number; monthly_amount: number; is_sample: boolean;
};
export type FundSip = { scheme_code: number; name: string; monthly_amount: number };
export type Pace = "on-pace" | "slightly-behind" | "well-behind" | "past";

/** Whole months from `from` to `to` (ISO dates); 0 if `to` is not in the future. */
export function monthsBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const m = (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
  return Math.max(0, m);
}

/** Future value of a monthly SIP paid at the start of each month, compounded monthly. */
export function sipFutureValue(monthly: number, months: number, annual: number) {
  if (months <= 0 || monthly <= 0) return 0;
  const i = annual / 12;
  return monthly * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
}

/** What money already saved grows to after `months`, compounded monthly. */
export function lumpFutureValue(saved: number, months: number, annual: number) {
  return saved * Math.pow(1 + annual / 12, Math.max(0, months));
}

/** Monthly SIP needed to reach `target` in `months` at `annual` return, given money already saved. */
export function sipNeeded(target: number, months: number, annual: number, saved = 0) {
  if (months <= 0) return Infinity;
  const gap = target - lumpFutureValue(saved, months, annual);
  if (gap <= 0) return 0;
  const i = annual / 12;
  return gap / (((Math.pow(1 + i, months) - 1) / i) * (1 + i));
}

/**
 * On pace: reaches the target even at the low assumed return.
 * Slightly behind: reaches it only at the high end of the range.
 * Well behind: falls short even at the high end.
 */
export function goalPace(target: number, monthly: number, months: number, saved = 0) {
  const low = lumpFutureValue(saved, months, RATE_LOW) + sipFutureValue(monthly, months, RATE_LOW);
  const high = lumpFutureValue(saved, months, RATE_HIGH) + sipFutureValue(monthly, months, RATE_HIGH);
  const pace: Pace = months <= 0 ? "past" : low >= target ? "on-pace" : high >= target ? "slightly-behind" : "well-behind";
  const neededLow = sipNeeded(target, months, RATE_LOW, saved);
  // Extra a month to be on pace even at the low return, rounded up to the next ₹500.
  const extra = pace === "slightly-behind" || pace === "well-behind" ? Math.ceil(Math.max(0, neededLow - monthly) / 500) * 500 : 0;
  return { pace, low, high, months, neededLow, extra };
}

/** ₹ in Indian style: lakh and crore for large amounts. */
export function inr(n: number) {
  if (!isFinite(n)) return "n/a";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} lakh`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** Full rupee amount with Indian grouping, for example ₹3,00,000. */
export const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** "December 2027" */
export const monthYear = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
