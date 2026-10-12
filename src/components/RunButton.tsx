"use client";
import { useState } from "react";

export default function RunButton({ label = "Generate report now" }: { label?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function run() {
    setBusy(true); setMsg("Fetching NAVs, indices and news, then asking Gemini. This takes up to a minute…");
    try {
      const post = (code?: string) => fetch("/api/report", { method: "POST", headers: code ? { "x-admin-passcode": code } : {} });
      let r = await post(sessionStorage.getItem("adminPasscode") ?? undefined);
      if (r.status === 401) {
        const code = window.prompt("Regenerating the report uses the Gemini quota, so it needs the admin passcode.");
        if (!code) { setMsg("Regeneration cancelled."); setBusy(false); return; }
        r = await post(code);
        if (r.ok) sessionStorage.setItem("adminPasscode", code);
      }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      location.reload();
    } catch (e) { setMsg((e as Error).message); setBusy(false); }
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <button onClick={run} disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {busy ? "Working…" : label}
      </button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
