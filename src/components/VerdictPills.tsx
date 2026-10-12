"use client";
import { useState } from "react";
import { VERDICTS } from "@/lib/ledger";

const HUE = ["var(--good)", "var(--warn)", "var(--bad)"];
const SOFT = ["var(--good-soft)", "var(--warn-soft)", "var(--bad-soft)"];

/** What each verdict means, in the terms the rules engine actually uses (judge in pipeline.ts). */
const INFO = [
  { rule: "No fund is flagged. Every fund is within 2 percentage points of its benchmark and its category average over the past month (0.3 points for the debt fund).", action: "Your SIPs keep running as planned." },
  { rule: "Exactly one fund trails its benchmark or category average by more than 2 percentage points over the past month (0.3 for the debt fund).", action: "Nothing to change yet. The report explains whether the gap is market-wide or specific to the fund.", example: true },
  { rule: "Two or more funds are flagged in the same week, or one fund has stayed flagged for three weeks in a row.", action: "Time to check whether the mix of funds still suits your goals. The report names the funds and the reason." },
];

/** The three possible verdicts. The active one is highlighted; tapping any of them explains when it is given. */
export default function VerdictPills({ assessment }: { assessment: string }) {
  const active = VERDICTS.indexOf(assessment as (typeof VERDICTS)[number]);
  const [open, setOpen] = useState<number | null>(null);
  // Only one pill is ever highlighted: the one being explored, or this week's verdict when nothing is open.
  const shown = open ?? -1;
  const lit = open ?? active;
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="The three possible verdicts">
        {VERDICTS.map((v, i) => {
          const on = i === active, sel = i === shown, hi = i === lit;
          return (
            <button key={v} type="button" role="tab" aria-selected={sel} aria-current={on ? "true" : undefined}
              onClick={() => setOpen(sel ? null : i)}
              className="relative cursor-pointer rounded-lg px-2 py-2 text-center text-[11px] font-medium leading-snug transition-colors sm:text-xs"
              style={{
                background: hi ? SOFT[i] : "var(--wash)", color: hi ? HUE[i] : "var(--muted)",
                boxShadow: hi ? `inset 0 0 0 ${sel ? 2 : 1}px ${HUE[i]}` : undefined,
              }}>
              {v}
              {on && !hi && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: HUE[i] }} aria-hidden />}
              {on && <span className="sr-only"> (this week)</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-faint">{open != null && open !== active ? `This week\u2019s verdict is \u201C${VERDICTS[active]}\u201D, marked with a dot.` : "Tap a verdict to see when it is given."}</p>
      {shown >= 0 && (
        <div role="tabpanel" className="mt-3 rounded-xl border p-4 text-sm leading-relaxed" style={{ borderColor: HUE[shown], background: SOFT[shown] }}>
          <p className="font-semibold" style={{ color: HUE[shown] }}>{VERDICTS[shown]}{shown === active ? " · this week" : ""}</p>
          <p className="mt-1 text-soft">{INFO[shown].rule}</p>
          <p className="mt-1 text-soft">{INFO[shown].action}</p>
          {INFO[shown].example && <a href="/example" className="mt-2 inline-block font-medium text-accent hover:underline">See a worked example &rarr;</a>}
        </div>
      )}
    </div>
  );
}
