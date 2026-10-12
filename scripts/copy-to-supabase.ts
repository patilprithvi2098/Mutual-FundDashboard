/**
 * One-off copy of every table from the old Neon database to Supabase.
 * Idempotent: rows are upserted on their primary keys, so re-running is safe.
 *
 *   npm run copy-to-supabase
 *
 * Source is NEON_DATABASE_URL (or DATABASE_URL), target is SUPABASE_DATABASE_URL, both from .env.local.
 */
import { Pool, types } from "pg";

// Keep DATE columns as plain 'YYYY-MM-DD' strings so no timezone shift can creep in while copying.
types.setTypeParser(1082, (v) => v);

const SOURCE = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
const TARGET = process.env.SUPABASE_DATABASE_URL;
const source = new Pool({ connectionString: SOURCE, max: 2 });
const target = new Pool({ connectionString: TARGET, max: 2 });

// No foreign keys, so order does not matter. Goals keep their ids so links like /goals?edit=3 still work.
const TABLES: { name: string; key: string[] }[] = [
  { name: "funds", key: ["scheme_code"] },
  { name: "category_peers", key: ["category", "scheme_code"] },
  { name: "nav_history", key: ["scheme_code", "nav_date"] },
  { name: "index_history", key: ["symbol", "close_date"] },
  { name: "weekly_snapshots", key: ["week_ending", "scheme_code"] },
  { name: "reports", key: ["week_ending"] },
  { name: "goals", key: ["id"] },
  { name: "fund_sips", key: ["scheme_code"] },
  { name: "goals_meta", key: ["key"] },
];
const BATCH = 500;

async function copy(table: string, key: string[]) {
  const rows = (await source.query(`select * from ${table}`)).rows as Record<string, unknown>[];
  if (!rows.length) return { table, copied: 0 };
  const cols = Object.keys(rows[0]);
  const updates = cols.filter((c) => !key.includes(c)).map((c) => `${c}=excluded.${c}`).join(", ");
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const params: unknown[] = [];
    const values = chunk.map((r) => `(${cols.map((c) => {
      const v = r[c];
      params.push(v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v);
      return `$${params.length}`;
    }).join(",")})`).join(",");
    await target.query(
      `insert into ${table}(${cols.join(",")}) values ${values} on conflict (${key.join(",")}) do ${updates ? `update set ${updates}` : "nothing"}`,
      params);
  }
  return { table, copied: rows.length };
}

async function main() {
  if (!SOURCE || !TARGET) throw new Error("Set NEON_DATABASE_URL (or DATABASE_URL) and SUPABASE_DATABASE_URL in .env.local");
  if (SOURCE === TARGET) throw new Error("Source and target are the same database");
  for (const t of TABLES) console.log(await copy(t.name, t.key));
  // Keep the goals id sequence ahead of the copied ids.
  await target.query(`select setval(pg_get_serial_sequence('goals','id'), greatest((select coalesce(max(id),1) from goals), 1))`);
  for (const t of TABLES) {
    const [s, d] = await Promise.all([source, target].map((p) => p.query(`select count(*)::int n from ${t.name}`)));
    console.log(`${t.name.padEnd(17)} source=${s.rows[0].n} target=${d.rows[0].n} ${s.rows[0].n === d.rows[0].n ? "OK" : "MISMATCH"}`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => Promise.all([source.end(), target.end()]));
