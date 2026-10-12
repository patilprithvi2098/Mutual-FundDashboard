"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { initials, shortName } from "@/lib/names";
import type { FundSip } from "@/lib/goalMath";

/** Sample monthly SIP per fund. Lives on Manage funds because it is a per-fund setting, not a goal. */
export default function SipForm({ sips }: { sips: FundSip[] }) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<number, string>>(Object.fromEntries(sips.map((s) => [s.scheme_code, String(s.monthly_amount)])));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const total = sips.reduce((a, s) => a + Number(amounts[s.scheme_code] || 0), 0);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/sips", { method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sips.map((s) => ({ scheme_code: s.scheme_code, monthly_amount: Number(amounts[s.scheme_code] || 0) }))) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setMsg({ ok: false, t: j.error ?? "Something went wrong. Please try again." });
      setMsg({ ok: true, t: "SIP amounts saved. The Overview and Insights pages now use them." }); router.refresh();
    } catch { setMsg({ ok: false, t: "Network error. Please try again." }); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={save} className="card p-5">
      <h2 className="text-[15px] font-semibold">Monthly SIP per fund <span className="ml-1 align-middle font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-warn">Sample data</span></h2>
      <p className="mt-1 text-sm text-muted">Illustrative amounts, not linked to any real account. They set the sample portfolio value on the Overview and the split on Insights.</p>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {sips.map((s) => (
          <li key={s.scheme_code} className="flex items-center gap-3 py-3">
            <span className="badge h-8 w-8 text-xs">{initials(s.name)}</span>
            <label htmlFor={`sip-${s.scheme_code}`} className="min-w-0 flex-1 truncate text-sm">{shortName(s.name)}</label>
            <span className="flex shrink-0 items-center gap-1 text-sm">
              <span className="text-muted">₹</span>
              <input id={`sip-${s.scheme_code}`} type="number" inputMode="numeric" min={0} step={500} value={amounts[s.scheme_code] ?? ""}
                onChange={(e) => setAmounts({ ...amounts, [s.scheme_code]: e.target.value })} className="num w-24 rounded-lg border border-line bg-card px-2 py-2 text-right" />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm text-muted">Total <span className="num font-medium text-ink">₹{total.toLocaleString("en-IN")}</span> a month</p>
        <button disabled={busy} className="min-h-[44px] rounded-xl bg-accent px-5 text-[15px] font-medium text-on-accent disabled:opacity-60">{busy ? "Saving…" : "Save SIP amounts"}</button>
      </div>
      {msg && <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}>{msg.t}</p>}
    </form>
  );
}
