import { Pool } from "pg";

const g = globalThis as unknown as { _pool?: Pool; _schema?: Promise<void> };

export function pool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return (g._pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }));
}

const SCHEMA = `
create table if not exists funds(
  scheme_code int primary key, name text not null, fund_house text, category text,
  benchmark_name text, benchmark_symbol text, active boolean not null default true,
  added_at timestamptz not null default now());
create table if not exists nav_history(
  scheme_code int not null, nav_date date not null, nav numeric not null,
  primary key(scheme_code, nav_date));
create table if not exists index_history(
  symbol text not null, close_date date not null, close numeric not null,
  primary key(symbol, close_date));
create table if not exists category_peers(
  category text not null, scheme_code int not null, name text, primary key(category, scheme_code));
create table if not exists weekly_snapshots(
  week_ending date not null, scheme_code int not null, fund_name text, category text,
  benchmark_name text, as_of date, nav numeric,
  ret_1w numeric, ret_1m numeric, ret_ytd numeric,
  bench_1w numeric, bench_1m numeric, bench_ytd numeric,
  cat_1w numeric, cat_1m numeric, cat_ytd numeric, peer_count int,
  status text, driver text, summary text, created_at timestamptz not null default now(),
  primary key(week_ending, scheme_code));
create table if not exists reports(
  week_ending date primary key, generated_at timestamptz not null default now(),
  assessment text not null, reason text, market_summary text, market jsonb, headlines jsonb,
  model text, ai_used boolean not null default false);
`;

export async function ensureSchema() {
  g._schema ??= pool().query(SCHEMA).then(() => undefined);
  try { await g._schema; } catch (e) { g._schema = undefined; throw e; }
}

export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  await ensureSchema();
  return (await pool().query(text, params)).rows as T[];
}
