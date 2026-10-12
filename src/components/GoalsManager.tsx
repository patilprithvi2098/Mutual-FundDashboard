"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import GoalItem from "@/components/GoalItem";
import type { FundSip, Goal } from "@/lib/goalMath";

type Form = { name: string; target_amount: string; target_date: string; saved_amount: string; monthly_amount: string };
const EMPTY: Form = { name: "", target_amount: "", target_date: "", saved_amount: "0", monthly_amount: "" };
const toForm = (g: Goal): Form => ({
  name: g.name, target_amount: String(g.target_amount), target_date: g.target_date,
  saved_amount: String(g.saved_amount), monthly_amount: String(g.monthly_amount),
});
const input = "mt-1 w-full rounded-lg border px-3 py-2.5 text-[15px] l-input";
const primary = "min-h-[44px] rounded-lg px-4 text-[15px] font-medium l-primary disabled:opacity-60";
const secondary = "min-h-[44px] rounded-lg border px-4 text-[15px] l-line l-soft";

function GoalForm({ value, onChange, onSubmit, onCancel, busy, submitLabel, extra }: {
  value: Form; onChange: (f: Form) => void; onSubmit: (e: React.FormEvent) => void; onCancel?: () => void;
  busy: boolean; submitLabel: string; extra?: React.ReactNode;
}) {
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 lg:grid-cols-2">
      <label className="l-muted text-sm lg:col-span-2">Goal name<input required maxLength={60} value={value.name} onChange={set("name")} placeholder="For example, a new car" className={input} /></label>
      <label className="l-muted text-sm">Target amount (₹)<input required type="number" inputMode="numeric" min={1000} step={1000} value={value.target_amount} onChange={set("target_amount")} className={input} /></label>
      <label className="l-muted text-sm">Target date<input required type="date" value={value.target_date} onChange={set("target_date")} className={input} /></label>
      <label className="l-muted text-sm">Saved so far (₹)<input required type="number" inputMode="numeric" min={0} step={500} value={value.saved_amount} onChange={set("saved_amount")} className={input} /></label>
      <label className="l-muted text-sm">Monthly saving for this goal (₹)<input required type="number" inputMode="numeric" min={0} step={500} value={value.monthly_amount} onChange={set("monthly_amount")} className={input} /></label>
      <div className="flex flex-wrap gap-2 lg:col-span-2">
        <button disabled={busy} className={primary}>{busy ? "Saving…" : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} className={secondary}>Cancel</button>}
        {extra}
      </div>
    </form>
  );
}

export default function GoalsManager({ goals, sips, today, initialEdit }: { goals: Goal[]; sips: FundSip[]; today: string; initialEdit: number | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(initialEdit);
  const [editForm, setEditForm] = useState<Form>(() => toForm(goals.find((g) => g.id === initialEdit) ?? goals[0] ?? ({} as Goal)));
  const [adding, setAdding] = useState(goals.length === 0);
  const [addForm, setAddForm] = useState<Form>(EMPTY);
  const [amounts, setAmounts] = useState<Record<number, string>>(Object.fromEntries(sips.map((s) => [s.scheme_code, String(s.monthly_amount)])));
  const [msg, setMsg] = useState<{ ok: boolean; t: string; where: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(url: string, method: string, body: unknown, where: string, done: string) {
    setBusy(true); setMsg(null);
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setMsg({ ok: false, t: j.error ?? "Something went wrong. Please try again.", where }); return false; }
    setMsg({ ok: true, t: done, where }); router.refresh(); return true;
  }
  const note = (where: string) => msg?.where === where && <p className="mt-3 text-sm" style={{ color: msg.ok ? "var(--l-ok)" : "var(--l-review)" }}>{msg.t}</p>;
  const total = sips.reduce((a, s) => a + Number(amounts[s.scheme_code] || 0), 0);

  return (
    <div>
      {goals.map((g) => (
        <GoalItem key={g.id} goal={g} today={today}
          action={editing !== g.id && (
            <button type="button" onClick={() => { setEditing(g.id); setEditForm(toForm(g)); setMsg(null); }}
              className="mt-3.5 block cursor-pointer text-[15px] underline underline-offset-4 hover:no-underline" style={{ color: "oklch(0.8 0.1 240)" }}>Edit this goal</button>
          )}>
          {editing === g.id && (
            <>
              <GoalForm value={editForm} onChange={setEditForm} busy={busy} submitLabel="Save changes" onCancel={() => setEditing(null)}
                onSubmit={async (e) => { e.preventDefault(); if (await send(`/api/goals?id=${g.id}`, "PATCH", editForm, `g${g.id}`, "Goal saved.")) setEditing(null); }}
                extra={<button type="button" disabled={busy} className={`${secondary} ml-auto`} style={{ color: "var(--l-review)" }}
                  onClick={async () => { if (confirm(`Delete "${g.name}"?`) && (await send(`/api/goals?id=${g.id}`, "DELETE", null, "list", "Goal deleted."))) setEditing(null); }}>Delete goal</button>} />
              {note(`g${g.id}`)}
            </>
          )}
        </GoalItem>
      ))}
      {goals.length > 0 && <div className="border-t l-line" />}

      <div className="mt-6">
        {adding ? (
          <div className="l-card p-[18px]">
            <h2 className="text-base font-semibold">Add a goal</h2>
            <GoalForm value={addForm} onChange={setAddForm} busy={busy} submitLabel="Add goal" onCancel={goals.length ? () => setAdding(false) : undefined}
              onSubmit={async (e) => { e.preventDefault(); if (await send("/api/goals", "POST", addForm, "add", "Goal added.")) { setAddForm(EMPTY); setAdding(false); } }} />
            {note("add")}
          </div>
        ) : (
          <button type="button" onClick={() => { setAdding(true); setMsg(null); }} className={secondary}>Add a goal</button>
        )}
        {note("list")}
      </div>

      <form className="l-card mt-14 p-[18px]" onSubmit={async (e) => {
        e.preventDefault();
        await send("/api/sips", "PUT", sips.map((s) => ({ scheme_code: s.scheme_code, monthly_amount: Number(amounts[s.scheme_code] || 0) })), "sip", "SIP amounts saved.");
      }}>
        <h2 className="text-base font-semibold">Monthly SIP per fund <span className="l-watch-text ml-1 font-mono text-[10px] font-medium uppercase tracking-[0.06em]">Sample data</span></h2>
        <p className="l-muted mt-1 text-sm leading-relaxed">These amounts are illustrative and are not linked to any real account. They set the split shown on the Trends page.</p>
        <div className="mt-3">
          {sips.map((s) => (
            <div key={s.scheme_code} className="flex items-center justify-between gap-3 border-t l-line py-3">
              <label htmlFor={`sip-${s.scheme_code}`} className="min-w-0 text-sm">{s.name}</label>
              <span className="flex shrink-0 items-center gap-1 text-sm">
                <span className="l-muted">₹</span>
                <input id={`sip-${s.scheme_code}`} type="number" inputMode="numeric" min={0} step={500} value={amounts[s.scheme_code] ?? ""}
                  onChange={(e) => setAmounts({ ...amounts, [s.scheme_code]: e.target.value })} className="l-input w-24 rounded-lg border px-2 py-2 text-right" />
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 border-t l-line pt-4">
          <p className="l-muted text-sm">Total {`₹${total.toLocaleString("en-IN")}`} a month</p>
          <button disabled={busy} className={primary}>Save SIP amounts</button>
        </div>
        {note("sip")}
      </form>
    </div>
  );
}
