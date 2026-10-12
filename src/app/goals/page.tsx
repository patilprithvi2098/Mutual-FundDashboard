import GoalsManager from "@/components/GoalsManager";
import { listGoals, listSips } from "@/lib/goals";
import { seedIfEmpty } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  await seedIfEmpty();
  const [goals, sips] = await Promise.all([listGoals(), listSips()]);
  return (
    <div className="space-y-4">
      <a href="/" className="text-sm text-muted hover:text-ink">← Back to report</a>
      <h1 className="text-2xl font-semibold">Goals and SIPs</h1>
      <p className="text-muted">Set what you are saving for. The home page shows whether your SIPs are on pace for each goal.</p>
      <GoalsManager goals={goals} sips={sips} />
    </div>
  );
}
