import type { ReactNode } from "react";
import { goalPace, monthsBetween, monthYear, rupees, type Goal, type Pace } from "@/lib/goalMath";

export const PACE: Record<Pace, { word: string; hue: string }> = {
  "on-pace": { word: "On pace", hue: "var(--l-ok)" },
  "slightly-behind": { word: "Slightly behind", hue: "var(--l-watch)" },
  "well-behind": { word: "Well behind", hue: "var(--l-review)" },
  past: { word: "Date passed", hue: "var(--faint)" },
};

const NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const n2w = (n: number) => NUM[n] ?? String(n);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const PHRASE: Record<Pace, [string, string]> = {
  "on-pace": ["is on pace", "are on pace"],
  "slightly-behind": ["is slightly behind", "are slightly behind"],
  "well-behind": ["is well behind", "are well behind"],
  past: ["has passed its date", "have passed their date"],
};

/** "One of your three goals is on pace, one is slightly behind, and one is well behind." */
export function goalsHeadline(paces: Pace[]) {
  const total = paces.length;
  if (!total) return "You have not set any goals yet.";
  const order: Pace[] = ["on-pace", "slightly-behind", "well-behind", "past"];
  const counts = order.map((p) => [p, paces.filter((x) => x === p).length] as const).filter(([, c]) => c > 0);
  if (total === 1) return `Your goal ${PHRASE[paces[0]][0]}.`;
  if (counts.length === 1) return `${total === 2 ? "Both" : `All ${n2w(total)}`} of your goals ${PHRASE[counts[0][0]][1]}.`;
  const parts = counts.map(([p, c], i) => (i === 0 ? `${cap(n2w(c))} of your ${n2w(total)} goals ${PHRASE[p][c === 1 ? 0 : 1]}` : `${n2w(c)} ${PHRASE[p][c === 1 ? 0 : 1]}`));
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}.`;
}

export function paceOf(goal: Goal, today: string) {
  return goalPace(goal.target_amount, goal.monthly_amount, monthsBetween(today, goal.target_date), goal.saved_amount);
}

/** One goal in the ledger style: name and status, amount and date, progress bar, saved so far, one sentence. */
export default function GoalItem({ goal, today, editHref, action, children }: {
  goal: Goal; today: string; editHref?: string; action?: ReactNode; children?: ReactNode;
}) {
  const p = paceOf(goal, today);
  const s = PACE[p.pace];
  const share = Math.min(100, Math.max(0, (goal.saved_amount / goal.target_amount) * 100));
  const when = monthYear(goal.target_date);
  const sentence =
    p.pace === "on-pace" ? `Your current SIPs are on pace to reach this goal by ${when}.`
    : p.pace === "past" ? "The target date for this goal has passed, so you may want to set a new one."
    : `Your current SIPs are ${p.pace === "slightly-behind" ? "slightly" : "well"} behind, and adding about ${rupees(p.extra)} a month would bring this goal back on pace.`;
  return (
    <div id={`goal-${goal.id}`} className="border-t l-line py-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[19px] font-semibold leading-snug">
          {goal.name}
        </h3>
        <span className="shrink-0 text-sm font-medium" style={{ color: s.hue }}>{s.word}</span>
      </div>
      <div className="l-muted mt-1 flex items-baseline justify-between gap-3 font-mono text-sm">
        <span className="num">{rupees(goal.target_amount)}</span>
        <span>by {when}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: "var(--wash)" }} role="img" aria-label={`${Math.round(share)} percent saved`}>
        <div className="h-full rounded-full" style={{ width: `${share}%`, background: s.hue }} />
      </div>
      <p className="l-faint mt-2 font-mono text-[13px]">{rupees(goal.saved_amount)} saved so far · {rupees(goal.monthly_amount)} a month</p>
      <p className="l-soft mt-3.5 text-[16px] leading-relaxed [text-wrap:pretty]">{sentence}</p>
      {editHref && <a href={editHref} className="mt-2 inline-block py-1.5 text-[15px] underline underline-offset-4 hover:no-underline" style={{ color: "var(--accent)" }}>Edit this goal</a>}
      {action}
      {children}
    </div>
  );
}
