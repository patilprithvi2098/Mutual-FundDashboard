import { NextResponse } from "next/server";
import { addFund, removeFund, activeFunds, ingestAll } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX_FUNDS = 10;

export async function GET() {
  return NextResponse.json(await activeFunds());
}

export async function POST(req: Request) {
  const { code } = await req.json().catch(() => ({}));
  const raw = String(code ?? "").trim();
  // Digits only and a sane length: a 300-digit string is still an "integer" to Number.isInteger,
  // and would otherwise be sent to mfapi.in as "1e+300".
  const n = /^\d{1,10}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n <= 0) return NextResponse.json({ error: "Enter a numeric scheme code, e.g. 120716." }, { status: 400 });
  const current = await activeFunds();
  if (current.length >= MAX_FUNDS && !current.some((f) => f.scheme_code === n))
    return NextResponse.json({ error: `A portfolio can track up to ${MAX_FUNDS} funds. Remove one first.` }, { status: 400 });
  try {
    const fund = await addFund(n);
    ingestAll().catch(() => undefined); // peers + benchmark warm-up; the next report picks it up
    return NextResponse.json({ ok: true, fund });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

export async function DELETE(req: Request) {
  const n = Number(new URL(req.url).searchParams.get("code"));
  if (!Number.isInteger(n)) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  await removeFund(n);
  return NextResponse.json({ ok: true });
}
