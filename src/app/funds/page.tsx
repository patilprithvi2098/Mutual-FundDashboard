import FundManager from "@/components/FundManager";
import { activeFunds, seedIfEmpty } from "@/lib/pipeline";
import { PageHead } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FundsPage() {
  await seedIfEmpty();
  const funds = await activeFunds();
  return (
    <div className="space-y-6">
      <PageHead title="Manage funds">No code changes needed: add or remove a fund and the next report adapts.</PageHead>
      <FundManager funds={funds} />
    </div>
  );
}
