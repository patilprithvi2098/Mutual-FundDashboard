import GoalItem, { goalsHeadline, paceOf } from "@/components/GoalItem";
import { RATE_HIGH, RATE_LOW, type Goal } from "@/lib/goals";
import { todayIST } from "@/lib/dates";

/** Home page goals section. Read-only; editing happens on /goals. */
export default function GoalsCard({ goals }: { goals: Goal[] }) {
  const today = todayIST();
  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold lg:text-xl">Your goals</h2>
        <a href="/goals" className="l-muted text-sm underline underline-offset-4 hover:no-underline">See all goals</a>
      </div>
      <p className="l-soft mt-1.5 text-[15px] leading-relaxed [text-wrap:pretty]">{goalsHeadline(goals.map((g) => paceOf(g, today).pace))}</p>
      {goals.length > 0 ? (
        <div className="mt-2">
          {goals.map((g) => <GoalItem key={g.id} goal={g} today={today} editHref={`/goals?edit=${g.id}#goal-${g.id}`} />)}
          <div className="border-t l-line" />
        </div>
      ) : (
        <a href="/goals" className="mt-4 inline-block text-[15px] underline underline-offset-4">Add your first goal</a>
      )}
      <p className="l-faint mt-4 text-xs leading-relaxed">
        Projections assume an annual return of {RATE_LOW * 100}% to {RATE_HIGH * 100}%, compounded monthly, on money already saved and on each goal&apos;s monthly saving.
        On pace means the goal is reached even at {RATE_LOW * 100}%, slightly behind means only at the upper end, and well behind means short even at {RATE_HIGH * 100}%.
        Sample goals and amounts are illustrative data.
      </p>
    </section>
  );
}
