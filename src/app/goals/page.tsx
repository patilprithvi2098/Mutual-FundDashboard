import GoalsManager from "@/components/GoalsManager";
import { goalsHeadline, paceOf } from "@/components/GoalItem";
import { listGoals, RATE_HIGH, RATE_LOW } from "@/lib/goals";
import { seedIfEmpty } from "@/lib/pipeline";
import { todayIST } from "@/lib/dates";
import SipCard from "@/components/SipCard";
import MoneyComparison from "@/components/MoneyComparison";

export const dynamic = "force-dynamic";

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await seedIfEmpty();
  const [goals, sp] = await Promise.all([listGoals(), searchParams]);
  const today = todayIST();
  const edit = Number(sp.edit);
  return (
    <div className="ledger">
      <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[360px_minmax(0,1fr)]">
        <header className="self-start lg:sticky lg:top-8">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight lg:text-[30px]">Your goals</h1>
          <p className="l-soft mt-3.5 text-[17px] leading-relaxed [text-wrap:pretty] lg:text-lg">{goalsHeadline(goals.map((g) => paceOf(g, today).pace))}</p>
          <p className="l-faint mt-4 text-xs leading-relaxed">
            Projections assume an annual return of {RATE_LOW * 100}% to {RATE_HIGH * 100}%, compounded monthly, on money already saved and on each
            goal&apos;s monthly saving. On pace means the goal is reached even at {RATE_LOW * 100}%, slightly behind means only at the upper end, and well
            behind means short even at {RATE_HIGH * 100}%.
          </p>
        </header>
        <div>
          <GoalsManager goals={goals} today={today} initialEdit={goals.some((g) => g.id === edit) ? edit : null} />
          <h2 className="mt-10 text-lg font-semibold">Good to know</h2>
          <div className="mt-3"><SipCard /></div>
          <MoneyComparison />
        </div>
      </div>
    </div>
  );
}
