"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type F = { scheme_code: number; name: string; category: string; benchmark_name: string | null };

export default function FundManager({ funds }: { funds: F[] }) {
  const [code, setCode] = useState(""); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false); const router = useRouter();

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await fetch("/api/funds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setMsg({ ok: false, t: j.error });
    setMsg({ ok: true, t: `Added ${j.fund.name}. It will appear in the next report.` }); setCode(""); router.refresh();
  }
  async function remove(c: number) {
    if (!confirm("Stop tracking this fund? Its history is kept.")) return;
    await fetch(`/api/funds?code=${c}`, { method: "DELETE" }); router.refresh();
  }
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="rounded-2xl border border-line bg-card p-5">
        <label htmlFor="code" className="font-semibold">Add a fund by scheme code</label>
        <p className="mt-1 text-sm text-muted">Find the code on mfapi.in or in your fund app (e.g. 120716 for UTI Nifty 50 Index Direct Growth).</p>
        <div className="mt-3 flex gap-2">
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="Scheme code"
            className="w-48 rounded-lg border border-line bg-bg px-3 py-2 text-sm" />
          <button disabled={busy || !code} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? "Checking…" : "Add fund"}</button>
        </div>
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.t}</p>}
      </form>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
        {funds.map((f) => (
          <li key={f.scheme_code} className="flex items-center justify-between gap-3 p-4">
            <div><p className="font-medium">{f.name}</p>
              <p className="text-xs text-muted">Code {f.scheme_code} · {f.category} · Benchmark: {f.benchmark_name ?? "none available"}</p></div>
            <button onClick={() => remove(f.scheme_code)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-bad hover:bg-red-50">Remove</button>
          </li>
        ))}
        {funds.length === 0 && <li className="p-4 text-sm text-muted">No funds yet. Add one above.</li>}
      </ul>
    </div>
  );
}
