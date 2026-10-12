import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { ensureGoalsSchema, listGoals } from "@/lib/goals";
import { todayIST } from "@/lib/dates";

export const dynamic = "force-dynamic";
const MAX_GOALS = 10;

export async function GET() {
  return NextResponse.json(await listGoals());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const target = Number(body.target_amount);
  const date = String(body.target_date ?? "");
  if (!name || name.length > 60) return NextResponse.json({ error: "Give the goal a name (up to 60 characters)." }, { status: 400 });
  if (!Number.isFinite(target) || target < 1000 || target > 1e10)
    return NextResponse.json({ error: "Target amount must be between ₹1,000 and ₹1,000 crore." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= todayIST())
    return NextResponse.json({ error: "Pick a target date in the future." }, { status: 400 });
  await ensureGoalsSchema();
  const [{ n }] = await q<{ n: string }>(`select count(*) n from goals`);
  if (Number(n) >= MAX_GOALS) return NextResponse.json({ error: `You can track up to ${MAX_GOALS} goals.` }, { status: 400 });
  const [goal] = await q(`insert into goals(name, target_amount, target_date) values($1,$2,$3) returning id`, [name, target, date]);
  return NextResponse.json({ ok: true, goal });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await ensureGoalsSchema();
  await q(`delete from goals where id=$1`, [id]);
  return NextResponse.json({ ok: true });
}
