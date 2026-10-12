import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { ensureGoalsSchema, listGoals } from "@/lib/goals";
import { todayIST } from "@/lib/dates";

export const dynamic = "force-dynamic";
const MAX_GOALS = 10;

type Input = { name: string; target_amount: number; target_date: string; saved_amount: number; monthly_amount: number };

/** Validates a goal body; returns the clean values or an error sentence. */
function parse(body: Record<string, unknown>): Input | { error: string } {
  const name = String(body.name ?? "").trim();
  const target = Number(body.target_amount);
  const date = String(body.target_date ?? "");
  const saved = Number(body.saved_amount ?? 0);
  const monthly = Number(body.monthly_amount ?? 0);
  if (!name || name.length > 60) return { error: "Give the goal a name of up to 60 characters." };
  if (!Number.isFinite(target) || target < 1000 || target > 1e10) return { error: "The target amount must be between ₹1,000 and ₹1,000 crore." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= todayIST()) return { error: "Pick a target date in the future." };
  if (!Number.isFinite(saved) || saved < 0 || saved > target) return { error: "The amount saved so far must be between ₹0 and the target." };
  if (!Number.isFinite(monthly) || monthly < 0 || monthly > 1e7) return { error: "The monthly saving must be between ₹0 and ₹1 crore." };
  return { name, target_amount: target, target_date: date, saved_amount: Math.round(saved), monthly_amount: Math.round(monthly) };
}

export async function GET() {
  return NextResponse.json(await listGoals());
}

export async function POST(req: Request) {
  const v = parse(await req.json().catch(() => ({})));
  if ("error" in v) return NextResponse.json(v, { status: 400 });
  await ensureGoalsSchema();
  const [{ n }] = await q<{ n: string }>(`select count(*) n from goals`);
  if (Number(n) >= MAX_GOALS) return NextResponse.json({ error: `You can track up to ${MAX_GOALS} goals.` }, { status: 400 });
  const [goal] = await q(
    `insert into goals(name, target_amount, target_date, saved_amount, monthly_amount) values($1,$2,$3,$4,$5) returning id`,
    [v.name, v.target_amount, v.target_date, v.saved_amount, v.monthly_amount]);
  return NextResponse.json({ ok: true, goal });
}

/** Edit a goal. Editing a sample goal turns it into Meera's own goal. */
export async function PATCH(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const v = parse(await req.json().catch(() => ({})));
  if ("error" in v) return NextResponse.json(v, { status: 400 });
  await ensureGoalsSchema();
  const rows = await q(
    `update goals set name=$2, target_amount=$3, target_date=$4, saved_amount=$5, monthly_amount=$6, is_sample=false where id=$1 returning id`,
    [id, v.name, v.target_amount, v.target_date, v.saved_amount, v.monthly_amount]);
  if (!rows.length) return NextResponse.json({ error: "That goal no longer exists." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await ensureGoalsSchema();
  await q(`delete from goals where id=$1`, [id]);
  return NextResponse.json({ ok: true });
}
