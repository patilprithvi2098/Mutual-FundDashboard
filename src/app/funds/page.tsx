import FundManager from "@/components/FundManager";
import { activeFunds, seedIfEmpty } from "@/lib/pipeline";
import { PageHead } from "@/components/ui";
import SipForm from "@/components/SipForm";
import { listSips } from "@/lib/goals";

export const dynamic = "force-dynamic";

export default async function FundsPage() {
  await seedIfEmpty();
  const [funds, sips] = await Promise.all([activeFunds(), listSips()]);
  return (
    <div className="space-y-6">
      <PageHead title="Manage funds">Add or remove a fund and the next report adapts. Set each fund's sample SIP amount here too.</PageHead>
      <FundManager funds={funds} />
      <SipForm sips={sips} />
    </div>
  );
}
