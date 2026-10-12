import { q } from "./db";
import type { Goal, FundSip } from "./goalMath";

export * from "./goalMath";

/** Sample monthly SIP seeded for each active fund until Meera edits it. */
export const SAMPLE_SIP = 3000;

/** Sample goals from the design. Each has its own monthly saving, so the three paces show. */
const SAMPLE_GOALS = [
  { name: "Emergency fund", target: 300000, date: "2027-12-31", saved: 185000, monthly: 7000 },
  { name: "Japan trip", target: 250000, date: "2028-04-30", saved: 62000, monthly: 9000 },
  { name: "Home down payment", target: 1000000, date: "2031-12-31", saved: 140000, monthly: 5000 },
];

const g = globalThis as unknown as { _goalsSchema?: Promise<void> };

/** Own tables, created on first use; the report pipeline's schema is not touched. */
export async function ensureGoalsSchema() {
  g._goalsSchema ??= (async () => {
    await q(`
      create table if not exists goals(
        id serial primary key, name text not null, target_amount numeric not null check (target_amount > 0),
        target_date date not null, is_sample boolean not null default false, created_at timestamptz not null default now());
      alter table goals add column if not exists saved_amount numeric not null default 0 check (saved_amount >= 0);
      alter table goals add column if not exists monthly_amount numeric not null default 0 check (monthly_amount >= 0);
      create table if not exists fund_sips(
        scheme_code int primary key, monthly_amount numeric not null check (monthly_amount >= 0),
        updated_at timestamptz not null default now());
      create table if not exists goals_meta(key text primary key, value text not null);`);
    // Seed the sample goals once. If only the earlier single sample goal exists, replace it; never touch goals Meera added.
    const [{ seeded }] = await q<{ seeded: boolean }>(`select exists(select 1 from goals_meta where key='samples_v2') seeded`);
    if (!seeded) {
      const [{ real }] = await q<{ real: string }>(`select count(*) filter (where not is_sample) real from goals`);
      if (Number(real) === 0) {
        await q(`delete from goals where is_sample`);
        for (const s of SAMPLE_GOALS)
          await q(`insert into goals(name, target_amount, target_date, saved_amount, monthly_amount, is_sample) values($1,$2,$3,$4,$5,true)`,
            [s.name, s.target, s.date, s.saved, s.monthly]);
      }
      await q(`insert into goals_meta values('samples_v2','1') on conflict do nothing`);
    }
  })();
  try { await g._goalsSchema; } catch (e) { g._goalsSchema = undefined; throw e; }
}

export async function listGoals() {
  await ensureGoalsSchema();
  const rows = await q<Record<string, string | number | boolean>>(
    `select id, name, target_amount::text, target_date::text, saved_amount::text, monthly_amount::text, is_sample
     from goals order by target_date, id`);
  return rows.map((r) => ({
    id: Number(r.id), name: String(r.name), target_date: String(r.target_date), is_sample: Boolean(r.is_sample),
    target_amount: Number(r.target_amount), saved_amount: Number(r.saved_amount), monthly_amount: Number(r.monthly_amount),
  })) as Goal[];
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
