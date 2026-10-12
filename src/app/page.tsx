import { latestReport } from "@/lib/queries";
import { seedIfEmpty } from "@/lib/pipeline";
import { listGoals } from "@/lib/goals";
import { VERDICTS } from "@/lib/ledger";
import { initials, inr0, loadPortfolio, plainCategory, shortName } from "@/lib/portfolio";
import ValueChart, { CountUp } from "@/components/ValueChart";
import GoalsCard from "@/components/GoalsCard";
import SipCard from "@/components/SipCard";
import MoneyComparison from "@/components/MoneyComparison";
import RunButton from "@/components/RunButton";
import { MarketCards, Sparkline, StatusPill, pctS, tone } from "@/components/ui";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date(Date.now() + 5.5 * 3600e3).getUTCHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
const monthYear = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const newsDate = (s: string) => { const d = new Date(s); return isNaN(+d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }); };

export default async function Overview() {
  let data, pf;
  try {
    await seedIfEmpty();
    [data, pf] = await Promise.all([latestReport(), loadPortfolio()]);
  } catch (e) {
    return <p className="card bg-bad-soft p-4 text-bad">Could not reach the database: {(e as Error).message}</p>;
  }
  const goals = await listGoals().catch(() => null);
  const last = pf.series.at(-1);
  const value = last?.value ?? 0, invested = last?.invested ?? 0, gain = value - invested;
  const sipTotal = pf.funds.reduce((s, f) => s + (pf.sipByCode[f.scheme_code] ?? 0), 0);
  const snapBy = new Map((data?.snaps ?? []).map((s) => [s.scheme_code, s]));
  const holdBy = new Map(pf.holdings.map((h) => [h.scheme_code, h]));
  const r = data?.report;
  const vIdx = r ? VERDICTS.indexOf(r.assessment as (typeof VERDICTS)[number]) : -1;
  const vHue = ["var(--good)", "var(--warn)", "var(--bad)"][vIdx] ?? "var(--accent)";
  const vSoft = ["var(--good-soft)", "var(--warn-soft)", "var(--bad-soft)"][vIdx] ?? "var(--accent-soft)";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[26px] font-semibold tracking-tight lg:text-[30px]">{greeting()}, Meera</h1>
        <p className="mt-1 text-[15px] text-muted">Here is how your funds are doing.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card p-5 lg:p-6">
          <p className="eyebrow">Portfolio value</p>
          <CountUp value={value} className="num mt-2 block text-[34px] font-semibold leading-none tracking-tight lg:text-[40px]" />
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-muted">Invested <span className="num font-medium text-ink">{inr0(invested)}</span></span>
            <span className="text-muted">Gain <span className={`num font-medium ${tone(gain)}`}>{gain >= 0 ? "+" : "−"}{inr0(Math.abs(gain))}{invested > 0 && ` (${pctS((gain / invested) * 100)})`}</span></span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-faint">
            Simulated: sample SIPs of {inr0(sipTotal)} a month across {pf.funds.length} funds, bought on the first trading day of each month
            {pf.start ? ` since ${monthYear(pf.start)}` : ""}, valued with real NAVs. Not linked to a real account.
          </p>
          <div className="mt-5 border-t border-line pt-5"><ValueChart series={pf.series} /></div>
        </section>

        <div className="space-y-5">
          {r ? (
            <a href="/report" className="card block p-5 transition-shadow hover:shadow-md">
              <p className="eyebrow">This week&apos;s verdict</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: vSoft, color: vHue }}>
                <span className="h-2 w-2 rounded-full bg-current" />{r.assessment}
              </p>
              <p className="mt-3 line-clamp-4 text-[15px] leading-relaxed text-soft">{r.reason}</p>
              <p className="mt-3 text-sm font-medium text-accent">Read the weekly report &rarr;</p>
            </a>
          ) : (
            <div className="card p-5"><p className="text-sm text-muted">No weekly report yet.</p><div className="mt-3"><RunButton /></div></div>
          )}
          {r && r.market.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold">Markets this week</h2>
              <MarketCards market={r.market} className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-1" />
            </section>
          )}
        </div>
      </div>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Your funds</h2>
          <a href="/fund" className="text-sm font-medium text-accent hover:underline">All funds</a>
        </div>
        <div className="card mt-3 divide-y divide-line overflow-hidden">
          {pf.funds.map((f) => {
            const s = snapBy.get(f.scheme_code), h = holdBy.get(f.scheme_code);
            const spark = (pf.navs.get(f.scheme_code) ?? []).slice(-60).map((p) => p.value);
            return (
              <a key={f.scheme_code} href={`/fund/${f.scheme_code}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-wash sm:px-5">
                <span className="badge">{initials(f.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{shortName(f.name)}</span>
                  <span className="block truncate text-[13px] text-muted">{plainCategory(f.category, f.name)}</span>
                </span>
                <Sparkline data={spark} className="hidden sm:block" />
                <span className="w-[112px] text-right sm:w-[150px]">
                  <span className="num block text-[15px] font-semibold">{h ? inr0(h.value) : "n/a"}</span>
                  <span className="num block text-xs text-muted">
                    1W <span className={`font-medium ${tone(s?.ret_1w)}`}>{pctS(s?.ret_1w)}</span>
                    {s?.bench_1w != null ? <> vs {pctS(s.bench_1w)}</> : s?.cat_1w != null ? <> vs cat. {pctS(s.cat_1w)}</> : null}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
        {data && data.snaps.some((s) => s.status !== "ok") && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.snaps.filter((s) => s.status !== "ok").map((s) => (<span key={s.scheme_code} className="flex items-center gap-2 text-sm">{shortName(s.fund_name)} <StatusPill status={s.status} /></span>))}
          </div>
        )}
        <p className="mt-2 text-xs text-faint">1W compares each fund with its benchmark, or with its category average where no benchmark exists.</p>
      </section>

      {r && r.headlines.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Key events this week</h2>
          <ul className="card mt-3 divide-y divide-line">
            {r.headlines.slice(0, 5).map((n, i) => (
              <li key={i} className="px-4 py-3 sm:px-5">
                <p className="text-[15px] leading-snug">{n.title}</p>
                <p className="mt-1 text-xs text-muted">{n.source}{newsDate(n.published) && ` · ${newsDate(n.published)}`}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {goals && <GoalsCard goals={goals} />}

      <div className="ledger max-w-3xl">
        <SipCard />
        <MoneyComparison />
      </div>
    </div>
  );
}
