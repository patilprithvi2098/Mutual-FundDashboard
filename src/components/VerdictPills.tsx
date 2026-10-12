"use client";
import { useState, type ReactNode } from "react";
import { VERDICTS } from "@/lib/ledger";

const HUE = ["var(--good)", "var(--warn)", "var(--bad)"];
const SOFT = ["var(--good-soft)", "var(--warn-soft)", "var(--bad-soft)"];

/** What each verdict means, in the terms the rules engine actually uses (judge in pipeline.ts). */
const INFO = [
  { rule: "No fund is flagged. Every fund is within 2 percentage points of its benchmark and its category average over the past month (0.3 points for the debt fund).", action: "Your SIPs keep running as planned." },
  { rule: "Exactly one fund trails its benchmark or category average by more than 2 percentage points over the past month (0.3 for the debt fund).", action: "Nothing to change yet. The report explains whether the gap is market-wide or specific to the fund.", example: true },
  { rule: "Two or more funds are flagged in the same week, or one fund has stayed flagged for three weeks in a row.", action: "Time to check whether the mix of funds still suits your goals. The report names the funds and the reason." },
];

/**
 * The three possible verdicts plus this week's headline. Tapping a different verdict swaps the headline
 * for an explanation of that verdict, so the two are never shown together; tapping this week's shows its rule beneath.
 */
export default function VerdictPills({ assessment, reason, children }: { assessment: string; reason: string; children?: ReactNode }) {
  const active = VERDICTS.indexOf(assessment as (typeof VERDICTS)[number]);
  const [open, setOpen] = useState<number | null>(null);
  const exploring = open != null && open !== active;
  const lit = open ?? active;
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="The three possible verdicts">
        {VERDICTS.map((v, i) => {
          const on = i === active, hi = i === lit;
          return (
            <button key={v} type="button" role="tab" aria-selected={hi} aria-current={on ? "true" : undefined}
              onClick={() => setOpen(open === i ? null : i)}
              className="relative cursor-pointer rounded-lg px-2 py-2 text-center text-[11px] font-medium leading-snug transition-colors sm:text-xs"
              style={{ background: hi ? SOFT[i] : "var(--wash)", color: hi ? HUE[i] : "var(--muted)", boxShadow: hi ? `inset 0 0 0 1px ${HUE[i]}` : undefined }}>
              {v}
              {on && !hi && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: HUE[i] }} aria-hidden />}
              {on && <span className="sr-only"> (this week)</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-faint">{exploring ? "You are reading about a different verdict. This week’s is marked with a dot." : "Tap a verdict to see when it is given."}</p>

      {exploring ? (
        <div role="tabpanel" className="mt-5">
          <p className="eyebrow" style={{ color: HUE[open] }}>Not this week&apos;s verdict · what it would mean</p>
          <h2 className="mt-1.5 text-[24px] font-semibold leading-tight tracking-tight lg:text-[28px]" style={{ color: HUE[open] }}>{VERDICTS[open]}</h2>
          <p className="mt-2.5 text-[16px] leading-relaxed text-soft [text-wrap:pretty]"><span className="font-medium text-ink">When it is given: </span>{INFO[open].rule}</p>
          <p className="mt-2 text-[16px] leading-relaxed text-soft [text-wrap:pretty]"><span className="font-medium text-ink">What to do: </span>{INFO[open].action}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <button type="button" onClick={() => setOpen(null)} className="min-h-[36px] cursor-pointer rounded-lg border border-line px-3 font-medium text-ink hover:bg-wash">&larr; Back to this week&apos;s verdict</button>
            {INFO[open].example && <a href="/example" className="font-medium text-accent hover:underline">See a worked example &rarr;</a>}
          </div>
        </div>
      ) : (
        <>
          <h2 className="mt-5 text-[24px] font-semibold leading-tight tracking-tight lg:text-[28px]" style={active > 0 ? { color: HUE[active] } : undefined}>{assessment}</h2>
          {open === active && (
            <p role="tabpanel" className="mt-2 rounded-lg px-3 py-2 text-sm leading-relaxed text-soft" style={{ background: SOFT[active] }}>
              <span className="font-medium" style={{ color: HUE[active] }}>When it is given: </span>{INFO[active].rule}
            </p>
          )}
          <p className="mt-2.5 text-[16px] leading-relaxed text-soft [text-wrap:pretty]">{reason}</p>
          {children}
        </>
      )}
    </div>
  );
}
