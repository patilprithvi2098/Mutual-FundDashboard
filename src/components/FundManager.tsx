"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { initials, plainCategory, shortName } from "@/lib/names";

type F = { scheme_code: number; name: string; category: string; benchmark_name: string | null; active: boolean };

export default function FundManager({ funds }: { funds: F[] }) {
  const [code, setCode] = useState(""); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false); const router = useRouter();

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/funds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const j = await r.json();
      if (!r.ok) return setMsg({ ok: false, t: j.error ?? "Could not add that fund." });
      setMsg({ ok: true, t: `Added ${shortName(j.fund.name)}. It will appear in the next weekly report.` }); setCode(""); router.refresh();
    } catch { setMsg({ ok: false, t: "Network error. Please try again." }); } finally { setBusy(false); }
  }
  async function remove(c: number, name: string) {
    if (!confirm(`Stop tracking ${shortName(name)}? Its history is kept.`)) return;
    await fetch(`/api/funds?code=${c}`, { method: "DELETE" }); setMsg({ ok: true, t: `Removed ${shortName(name)}.` }); router.refresh();
  }
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card p-5">
        <label htmlFor="code" className="text-[15px] font-semibold">Add a fund by scheme code</label>
        <p className="mt-1 text-sm text-muted">Find the code on mfapi.in or in your fund app, for example 120716 for UTI Nifty 50 Index Direct Growth.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="Scheme code"
            className="min-h-[44px] w-full rounded-xl border border-line bg-card px-3 text-[15px] sm:w-56" />
          <button disabled={busy || !code} className="min-h-[44px] rounded-xl bg-accent px-5 text-[15px] font-medium text-white disabled:opacity-60">{busy ? "Checking…" : "Add fund"}</button>
        </div>
        {msg && (
          <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{msg.t}</p>
        )}
      </form>

      <section>
        <h2 className="text-base font-semibold">Currently tracking</h2>
        <ul className="card mt-3 divide-y divide-line">
          {funds.map((f) => (
            <li key={f.scheme_code} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <span className="badge">{initials(f.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{shortName(f.name)}</p>
                <p className="truncate text-xs text-muted">Code {f.scheme_code} · {plainCategory(f.category, f.name)} · {f.benchmark_name ? `vs ${f.benchmark_name}` : "category average only"}</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-good"><span className="h-2 w-2 rounded-full bg-good" />Active</span>
              <button onClick={() => remove(f.scheme_code, f.name)} className="min-h-[36px] rounded-lg border border-line px-3 text-sm text-bad hover:bg-bad-soft">Remove</button>
            </li>
          ))}
          {funds.length === 0 && <li className="p-4 text-sm text-muted">No funds yet. Add one above.</li>}
        </ul>
      </section>
    </div>
  );
}
