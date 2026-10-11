import { NextResponse } from "next/server";
import { generateReport } from "@/lib/pipeline";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Manual "generate now" button. Cooldown protects the Gemini quota on a public URL. */
export async function POST() {
  const [last] = await q<{ age: number }>(`select extract(epoch from now()-max(generated_at))::float age from reports`);
  if (last?.age != null && last.age < 60) return NextResponse.json({ error: "A report was generated moments ago. Try again in a minute." }, { status: 429 });
  try {
    return NextResponse.json({ ok: true, ...(await generateReport()) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
