"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FundSip, Goal } from "@/lib/goals";

const field = "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm";

export default function GoalsManager({ goals, sips }: { goals: Goal[]; sips: FundSip[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", target_amount: "", target_date: "" });
  const [amounts, setAmounts] = useState<Record<number, string>>(Object.fromEntries(sips.map((s) => [s.scheme_code, String(s.monthly_amount)])));
  const [msg, setMsg] = useState<{ ok: boolean; t: string; where: "goal" | "sip" } | null>(null);
  const [busy, setBusy] = useState(false);

  async function addGoal(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setMsg({ ok: false, t: j.error, where: "goal" });
    setForm({ name: "", target_amount: "", target_date: "" });
    setMsg({ ok: true, t: "Goal added.", where: "goal" }); router.refresh();
  }
  async function removeGoal(id: number) {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals?id=${id}`, { method: "DELETE" }); router.refresh();
  }
  async function saveSips(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const body = sips.map((s) => ({ scheme_code: s.scheme_code, monthly_amount: Number(amounts[s.scheme_code] || 0) }));
    const r = await fetch("/api/sips", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json(); setBusy(false);
    setMsg(r.ok ? { ok: true, t: "SIP amounts saved.", where: "sip" } : { ok: false, t: j.error, where: "sip" });
    if (r.ok) router.refresh();
  }
  const note = (where: "goal" | "sip") => msg?.where === where && <p className={`mt-3 text-sm ${msg.ok ? "text-good" : "text-bad"}`}>{msg.t}</p>;
  const total = sips.reduce((a, s) => a + Number(amounts[s.scheme_code] || 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-semibold">Your goals</h2>
        <ul className="mt-3 divide-y divide-line">
          {goals.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium">{g.name}{g.is_sample && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-warn">Sample</span>}</p>
                <p className="text-xs text-muted">₹{g.target_amount.toLocaleString("en-IN")} by {g.target_date}</p>
              </div>
              <button onClick={() => removeGoal(g.id)} className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm text-bad hover:bg-red-50">Delete</button>
            </li>
          ))}
          {goals.length === 0 && <li className="py-3 text-sm text-muted">No goals yet.</li>}
        </ul>
        <form onSubmit={addGoal} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <label className="text-sm">Goal name<input required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Car" className={`mt-1 ${field}`} /></label>
          <label className="text-sm">Target (₹)<input required inputMode="numeric" type="number" min={1000} step={1000} value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} className={`mt-1 ${field}`} /></label>
          <label className="text-sm">Target date<input required type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className={`mt-1 ${field}`} /></label>
          <button disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Add goal</button>
        </form>
        {note("goal")}
      </section>

      <form onSubmit={saveSips} className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-semibold">Monthly SIP per fund <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-warn">Sample data</span></h2>
        <p className="mt-1 text-sm text-muted">These amounts are illustrative and not linked to any real account. Edit them to match your own SIPs; they are used only for goal projections.</p>
        <ul className="mt-3 divide-y divide-line">
          {sips.map((s) => (
            <li key={s.scheme_code} className="flex items-center justify-between gap-3 py-3">
              <label htmlFor={`sip-${s.scheme_code}`} className="min-w-0 text-sm">{s.name}</label>
              <div className="flex shrink-0 items-center gap-1 text-sm">
                <span className="text-muted">₹</span>
                <input id={`sip-${s.scheme_code}`} type="number" inputMode="numeric" min={0} step={500} value={amounts[s.scheme_code] ?? ""}
                  onChange={(e) => setAmounts({ ...amounts, [s.scheme_code]: e.target.value })} className="w-24 rounded-lg border border-line bg-bg px-2 py-1.5 text-right" />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">Total ₹{total.toLocaleString("en-IN")} a month</p>
          <button disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Save SIP amounts</button>
        </div>
        {note("sip")}
      </form>
    </div>
  );
}
