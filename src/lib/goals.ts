import { q } from "./db";
import { todayIST, addDays } from "./dates";

/** Assumed annual return range for goal projections. Shown on screen wherever a projection appears. */
export const RATE_LOW = 0.08;
export const RATE_HIGH = 0.12;
/** Sample monthly SIP seeded for each active fund until Meera edits it. */
export const SAMPLE_SIP = 3000;

export type Goal = { id: number; name: string; target_amount: number; target_date: string; is_sample: boolean };
export type FundSip = { scheme_code: number; name: string; monthly_amount: number };
export type Pace = "on-pace" | "slightly-behind" | "well-behind" | "past";

const g = globalThis as unknown as { _goalsSchema?: Promise<void> };

/** Own tables, created on first use; the report pipeline's schema is not touched. */
export async function ensureGoalsSchema() {
  g._goalsSchema ??= (async () => {
    const [{ existed }] = await q<{ existed: boolean }>(`select to_regclass('public.goals') is not null existed`);
    await q(`
      create table if not exists goals(
        id serial primary key, name text not null, target_amount numeric not null check (target_amount > 0),
        target_date date not null, is_sample boolean not null default false, created_at timestamptz not null default now());
      create table if not exists fund_sips(
        scheme_code int primary key, monthly_amount numeric not null check (monthly_amount >= 0),
        updated_at timestamptz not null default now());`);
    // One sample goal, only when the table is first created, so deleting it does not bring it back.
    if (!existed)
      await q(`insert into goals(name, target_amount, target_date, is_sample) values($1, $2, $3, true)`,
        ["Home down payment", 1200000, addDays(todayIST(), 365 * 5)]);
  })();
  try { await g._goalsSchema; } catch (e) { g._goalsSchema = undefined; throw e; }
}

export async function listGoals() {
  await ensureGoalsSchema();
  const rows = await q<{ id: number; name: string; target_amount: string; target_date: string; is_sample: boolean }>(
    `select id, name, target_amount::text, target_date::text, is_sample from goals order by target_date, id`);
  return rows.map((r) => ({ ...r, target_amount: Number(r.target_amount) })) as Goal[];
}

/** Sample SIP per active fund; funds without a row get the sample amount. */
export async function listSips() {
  await ensureGoalsSchema();
  await q(`insert into fund_sips(scheme_code, monthly_amount) select scheme_code, $1 from funds where active on conflict do nothing`, [SAMPLE_SIP]);
  const rows = await q<{ scheme_code: number; name: string; monthly_amount: string }>(
    `select f.scheme_code, f.name, s.monthly_amount::text from funds f join fund_sips s using (scheme_code)
     where f.active order by f.added_at, f.scheme_code`);
  return rows.map((r) => ({ ...r, monthly_amount: Number(r.monthly_amount) })) as FundSip[];
}

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

/** Monthly SIP needed to reach `target` in `months` at `annual` return. */
export function sipNeeded(target: number, months: number, annual: number) {
  if (months <= 0) return Infinity;
  const i = annual / 12;
  return target / (((Math.pow(1 + i, months) - 1) / i) * (1 + i));
}

/**
 * On pace: reaches the target even at the low assumed return.
 * Slightly behind: reaches it only at the high end of the range.
 * Well behind: falls short even at the high end.
 */
export function goalPace(target: number, monthly: number, months: number) {
  const low = sipFutureValue(monthly, months, RATE_LOW);
  const high = sipFutureValue(monthly, months, RATE_HIGH);
  const pace: Pace = months <= 0 ? "past" : low >= target ? "on-pace" : high >= target ? "slightly-behind" : "well-behind";
  return { pace, low, high, months, neededLow: sipNeeded(target, months, RATE_LOW) };
}

/** ₹ in Indian style: lakh and crore for large amounts. */
export function inr(n: number) {
  if (!isFinite(n)) return "n/a";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} lakh`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
