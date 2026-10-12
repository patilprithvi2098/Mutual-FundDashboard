import { NextResponse } from "next/server";
import { generateReport } from "@/lib/pipeline";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Manual "generate now" button. When ADMIN_PASSCODE is set, the caller must send it in x-admin-passcode,
 * so visitors to the public URL cannot spend the Gemini quota. The cooldown is a second guard.
 */
export async function POST(req: Request) {
  const passcode = process.env.ADMIN_PASSCODE;
  if (passcode && req.headers.get("x-admin-passcode") !== passcode)
    return NextResponse.json({ error: "Enter the admin passcode to regenerate the report." }, { status: 401 });
  const [last] = await q<{ age: number }>(`select extract(epoch from now()-max(generated_at))::float age from reports`);
  if (last?.age != null && last.age < 60) return NextResponse.json({ error: "A report was generated moments ago. Try again in a minute." }, { status: 429 });
  try {
    return NextResponse.json({ ok: true, ...(await generateReport()) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
