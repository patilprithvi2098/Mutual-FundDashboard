import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { ensureGoalsSchema, listSips } from "@/lib/goals";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listSips());
}

/** Body: [{ scheme_code, monthly_amount }]. Updates the sample SIP amounts. */
export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body) || !body.length || body.length > 20) return NextResponse.json({ error: "Send a list of SIP amounts." }, { status: 400 });
  for (const r of body) {
    const amt = Number(r?.monthly_amount);
    if (!Number.isInteger(Number(r?.scheme_code)) || !Number.isFinite(amt) || amt < 0 || amt > 1e7)
      return NextResponse.json({ error: "Each SIP must be between ₹0 and ₹1 crore a month." }, { status: 400 });
  }
  await ensureGoalsSchema();
  for (const r of body)
    await q(`insert into fund_sips(scheme_code, monthly_amount, updated_at) values($1,$2,now())
             on conflict (scheme_code) do update set monthly_amount=excluded.monthly_amount, updated_at=now()`,
      [Number(r.scheme_code), Math.round(Number(r.monthly_amount))]);
  return NextResponse.json({ ok: true });
}
