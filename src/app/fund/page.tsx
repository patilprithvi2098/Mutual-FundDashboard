import { latestReport } from "@/lib/queries";
import { seedIfEmpty } from "@/lib/pipeline";
import { initials, inr0, loadPortfolio, plainCategory, shortName } from "@/lib/portfolio";
import { PageHead, Sparkline, StatusPill, pctS, tone } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "My funds · Meera's Wealth" };

export default async function FundsList() {
  await seedIfEmpty();
  const [pf, data] = await Promise.all([loadPortfolio(), latestReport().catch(() => null)]);
  const snapBy = new Map((data?.snaps ?? []).map((s) => [s.scheme_code, s]));
  const holdBy = new Map(pf.holdings.map((h) => [h.scheme_code, h]));
  return (
    <div className="space-y-6">
      <PageHead title="My funds">Tap a fund for its returns, chart and weekly summaries.</PageHead>
      <div className="grid gap-4 md:grid-cols-2">
        {pf.funds.map((f) => {
          const s = snapBy.get(f.scheme_code), h = holdBy.get(f.scheme_code);
          const spark = (pf.navs.get(f.scheme_code) ?? []).slice(-60).map((p) => p.value);
          return (
            <a key={f.scheme_code} href={`/fund/${f.scheme_code}`} className="card block p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start gap-3">
                <span className="badge">{initials(f.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold leading-snug">{shortName(f.name)}</p>
                  <p className="text-sm text-muted">{plainCategory(f.category, f.name)}</p>
                </div>
                {s && <StatusPill status={s.status} />}
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="num text-xl font-semibold">{h ? inr0(h.value) : "n/a"}</p>
                  <p className="num text-xs text-muted">
                    1W <span className={`font-medium ${tone(s?.ret_1w)}`}>{pctS(s?.ret_1w)}</span>
                    {s?.bench_1w != null && <> · {f.benchmark_name} {pctS(s.bench_1w)}</>}
                  </p>
                </div>
                <Sparkline data={spark} />
              </div>
            </a>
          );
        })}
      </div>
      <a href="/funds" className="inline-block py-1 text-sm font-medium text-accent hover:underline">Add or remove a fund &rarr;</a>
    </div>
  );
}
