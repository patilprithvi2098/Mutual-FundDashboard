import { goalPace, inr, monthsBetween, RATE_HIGH, RATE_LOW, type FundSip, type Goal, type Pace } from "@/lib/goals";
import { longDate } from "@/lib/ledger";
import { todayIST } from "@/lib/dates";

const PACE: Record<Pace, { word: string; cls: string }> = {
  "on-pace": { word: "On pace", cls: "l-ok" },
  "slightly-behind": { word: "Slightly behind", cls: "l-watch" },
  "well-behind": { word: "Well behind", cls: "l-review" },
  past: { word: "Date has passed", cls: "l-faint" },
};
const pctRange = `${RATE_LOW * 100}% to ${RATE_HIGH * 100}%`;

export default function GoalsCard({ goals, sips }: { goals: Goal[]; sips: FundSip[] }) {
  const monthly = sips.reduce((a, s) => a + s.monthly_amount, 0);
  const today = todayIST();
  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold lg:text-xl">Your goals</h2>
        <a href="/goals" className="text-sm l-muted underline underline-offset-4 hover:no-underline">Edit goals and SIPs</a>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed l-muted lg:text-[15px]">
        Using your <span className="l-watch-text">sample</span> SIPs of {inr(monthly)} a month across {sips.length} funds.
      </p>

      {goals.length === 0 ? (
        <p className="mt-5 border-t l-line pt-4 text-[15px] l-soft">No goals yet. <a href="/goals" className="underline underline-offset-4">Add your first goal</a>.</p>
      ) : (
        <div className="mt-5">
          {goals.map((goal) => {
            const p = goalPace(goal.target_amount, monthly, monthsBetween(today, goal.target_date));
            const s = PACE[p.pace];
            return (
              <div key={goal.id} className="border-t l-line py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-medium leading-snug lg:text-[17px]">
                      {goal.name}
                      {goal.is_sample && <span className="ml-2 align-middle font-mono text-[10px] uppercase tracking-[0.06em] l-watch-text">Sample</span>}
                    </p>
                    <p className="mt-1 text-sm l-muted">{inr(goal.target_amount)} by {longDate(goal.target_date)}</p>
                  </div>
                  <span className={`flex shrink-0 items-center gap-[7px] text-[13px] font-medium ${s.cls}`}>
                    <span className="l-dot" />
                    {s.word}
                  </span>
                </div>
                {p.pace !== "past" && (
                  <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed l-soft">
                    In {p.months} months these SIPs could grow to {inr(p.low)} to {inr(p.high)}.
                    {p.pace !== "on-pace" && ` To be on pace even at ${RATE_LOW * 100}%, you would need about ${inr(p.neededLow)} a month.`}
                  </p>
                )}
              </div>
            );
          })}
          <div className="border-t l-line" />
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed l-faint">
        Projection assumes an annual return of {pctRange}, compounded monthly, on future SIPs only (money already invested is not counted).
        Each goal assumes all your SIPs go towards it. On pace means the goal is reached even at {RATE_LOW * 100}%; slightly behind means
        only at the upper end; well behind means short even at {RATE_HIGH * 100}%. SIP amounts are sample data, not your real holdings.
      </p>
    </section>
  );
}
