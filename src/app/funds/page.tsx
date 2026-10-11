import FundManager from "@/components/FundManager";
import { activeFunds, seedIfEmpty } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export default async function FundsPage() {
  await seedIfEmpty();
  const funds = await activeFunds();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Manage funds</h1>
      <p className="text-muted">No code changes needed: add or remove a fund and the next report adapts.</p>
      <FundManager funds={funds} />
    </div>
  );
}
