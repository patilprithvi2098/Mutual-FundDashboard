import { latestReport } from "@/lib/queries";
import { seedIfEmpty } from "@/lib/pipeline";
import { listGoals } from "@/lib/goals";
import { INDICES } from "@/lib/benchmarks";
import { addDays } from "@/lib/dates";
import { valueOnOrBefore } from "@/lib/returns";
import { VERDICTS, longDate } from "@/lib/ledger";
import { indexTails, initials, inr0, loadPortfolio, shortName } from "@/lib/portfolio";
import { paceOf } from "@/components/GoalItem";
import { monthYear } from "@/lib/goalMath";
import ValueChart, { CountUp } from "@/components/ValueChart";
import Donut, { SERIES } from "@/components/Donut";
import RunButton from "@/components/RunButton";
import { Sparkline, pctS, tone } from "@/components/ui";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date(Date.now() + 5.5 * 3600e3).getUTCHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
const newsDate = (s: string) => { const d = new Date(s); return isNaN(+d) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }); };
const VHUE = ["var(--good)", "var(--warn)", "var(--bad)"], VSOFT = ["var(--good-soft)", "var(--warn-soft)", "var(--bad-soft)"];
const PACE: Record<string, string> = { "on-pace": "var(--good)", "slightly-behind": "var(--warn)", "well-behind": "var(--bad)", past: "var(--faint)" };

const Ic = (d: ReactNode) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;
const ICON = {
  wallet: Ic(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12h5M3 10h18" /></>),
  trend: Ic(<><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>),
  repeat: Ic(<><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></>),
  shield: Ic(<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" /><path d="M9 12l2 2 4-4" /></>),
};

/** Stat tile in the style of the reference dashboard: label, big number, delta line, tinted icon. */
function Tile({ label, value, delta, icon, tint, href }: { label: string; value: ReactNode; delta: ReactNode; icon: ReactNode; tint: string; href?: string }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${tint} 14%, transparent)`, color: tint }}>{icon}</span>
      </div>
      <div className="num mt-1 text-[26px] font-semibold leading-none tracking-tight">{value}</div>
      <p className="mt-2.5 text-xs text-muted">{delta}</p>
    </>
  );
  return href ? <a href={href} className="card block p-4 transition-shadow hover:shadow-md">{body}</a> : <div className="card p-4">{body}</div>;
}

export default async function Overview() {
  let data, pf;
  try {
    await seedIfEmpty();
    [data, pf] = await Promise.all([latestReport(), loadPortfolio()]);
  } catch (e) {
    return <p className="card bg-bad-soft p-4 text-bad">Could not reach the database: {(e as Error).message}</p>;
  }
  const r = data?.report;
  const goals = await listGoals().catch(() => []);
  const marketSyms = (r?.market ?? []).map((m) => Object.values(INDICES).find((i) => i.name === m.index)?.symbol).filter((s): s is string => !!s);
  const idxTails = await indexTails(marketSyms);

  // Headline numbers from the simulated sample-SIP portfolio.
  const last = pf.series.at(-1);
  const value = last?.value ?? 0, invested = last?.invested ?? 0, gain = value - invested;
  const weekAgo = last ? valueOnOrBefore(pf.series.map((p) => ({ date: p.d, value: p.value })), addDays(last.d, -7)) : null;
  const wk = weekAgo && weekAgo.value ? ((value - weekAgo.value) / weekAgo.value) * 100 : null;
  const sipTotal = pf.funds.reduce((s, f) => s + (pf.sipByCode[f.scheme_code] ?? 0), 0);
  const holdBy = new Map(pf.holdings.map((h) => [h.scheme_code, h]));
  const snapBy = new Map((data?.snaps ?? []).map((s) => [s.scheme_code, s]));
  const flagged = (data?.snaps ?? []).filter((s) => s.status !== "ok").length;
  const vIdx = r ? VERDICTS.indexOf(r.assessment as (typeof VERDICTS)[number]) : -1;
  const alloc = pf.funds.map((f) => ({ label: shortName(f.name), value: holdBy.get(f.scheme_code)?.value ?? 0, code: f.scheme_code })).sort((a, b) => b.value - a.value);
  const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight lg:text-[30px]">{greeting()}, Meera</h1>
          <p className="mt-1 text-[15px] text-muted">A summary of your funds this week. Each tab below has the detail.</p>
        </div>
        {r && <a href="/report" className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm text-soft hover:bg-wash">Week ending {longDate(r.week_ending)} &rarr;</a>}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Tile label="Portfolio value" value={<CountUp value={value} />} icon={ICON.wallet} tint="var(--accent)"
          delta={wk == null ? "Sample SIPs at real NAVs" : <><span className={`num font-medium ${tone(wk)}`}>{pctS(wk)}</span> vs last week</>} />
        <Tile label="Total gain" value={<span className={tone(gain)}>{gain >= 0 ? "+" : "−"}{inr0(Math.abs(gain))}</span>} icon={ICON.trend} tint="var(--good)"
          delta={<><span className={`num font-medium ${tone(gain)}`}>{invested ? pctS((gain / invested) * 100) : "n/a"}</span> on {inr0(invested)} invested</>} />
        <Tile label="Monthly SIPs" value={inr0(sipTotal)} icon={ICON.repeat} tint="var(--warn)" href="/goals"
          delta={<>{pf.funds.length} funds · sample amounts</>} />
        <Tile label="This week's verdict" icon={ICON.shield} tint={VHUE[vIdx] ?? "var(--accent)"} href="/report"
          value={r ? <span className="block text-[18px] leading-tight" style={{ color: vIdx > 0 ? VHUE[vIdx] : undefined }}>{r.assessment}</span> : <span className="text-[18px]">No report yet</span>}
          delta={r ? <>{flagged === 0 ? "All funds on track" : `${flagged} fund${flagged > 1 ? "s" : ""} flagged`} · read the report &rarr;</> : "Generate the first report"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section className="card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">Portfolio performance</h2>
            <span className="text-xs text-faint">Simulated from sample SIPs, real NAVs</span>
          </div>
          <div className="mt-3"><ValueChart series={pf.series} /></div>
        </section>
        <section className="card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">Allocation</h2>
            <a href="/fund" className="text-sm font-medium text-accent hover:underline">My funds</a>
          </div>
          <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row lg:flex-col">
            <Donut parts={alloc} centre={inr0(value)} sub="by value" />
            <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
              {alloc.map((a, i) => (
                <li key={a.code}>
                  <a href={`/fund/${a.code}`} className="flex items-center gap-2 rounded-lg hover:bg-wash">
                    <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: SERIES[i % SERIES.length] }} />
                    <span className="min-w-0 flex-1 truncate">{a.label}</span>
                    <span className="num text-muted">{value ? Math.round((a.value / value) * 100) : 0}%</span>
                    <span className="num w-[72px] text-right font-medium">{inr0(a.value)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="card p-4">
        <h2 className="px-1 text-base font-semibold">Market watch</h2>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {(r?.market ?? []).map((m, i) => (
            <div key={m.index} className="flex min-w-[196px] flex-none items-center gap-3 rounded-xl bg-wash px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{m.index}</p>
                <p className="num text-xs text-muted"><span className={`font-medium ${tone(m.w)}`}>{pctS(m.w)}</span> this week</p>
              </div>
              <Sparkline data={idxTails.get(marketSyms[i]) ?? []} className="!w-16" />
            </div>
          ))}
          {pf.funds.map((f) => {
            const s = snapBy.get(f.scheme_code);
            return (
              <a key={f.scheme_code} href={`/fund/${f.scheme_code}`} className="flex min-w-[196px] flex-none items-center gap-3 rounded-xl border border-line px-3 py-2.5 hover:bg-wash">
                <span className="badge h-8 w-8 text-xs">{initials(f.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{shortName(f.name)}</p>
                  <p className="num text-xs text-muted"><span className={`font-medium ${tone(s?.ret_1w)}`}>{pctS(s?.ret_1w)}</span> this week</p>
                </div>
                <Sparkline data={(pf.navs.get(f.scheme_code) ?? []).slice(-60).map((p) => p.value)} className="!w-16" />
              </a>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">This week&apos;s report</h2>
            <a href="/report" className="text-sm font-medium text-accent hover:underline">Read</a>
          </div>
          {r ? (
            <>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: VSOFT[vIdx] ?? "var(--accent-soft)", color: VHUE[vIdx] ?? "var(--accent)" }}>
                <span className="h-2 w-2 rounded-full bg-current" />{r.assessment}
              </p>
              <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-soft">{r.reason}</p>
              <p className="mt-3 text-xs text-faint">{r.ai_used ? `Written by ${r.model}` : "Written by the backup rules"}</p>
            </>
          ) : (
            <div className="mt-3"><p className="text-sm text-muted">No weekly report yet.</p><div className="mt-3"><RunButton /></div></div>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">Goals</h2>
            <a href="/goals" className="text-sm font-medium text-accent hover:underline">All goals</a>
          </div>
          {goals.length ? (
            <ul className="mt-3 space-y-3">
              {goals.slice(0, 4).map((g) => {
                const p = paceOf(g, today), share = Math.min(100, (g.saved_amount / g.target_amount) * 100);
                return (
                  <li key={g.id}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{g.name}</span>
                      <span className="flex-none text-xs" style={{ color: PACE[p.pace] }}>{p.pace === "on-pace" ? "On pace" : p.pace === "slightly-behind" ? "Slightly behind" : p.pace === "well-behind" ? "Well behind" : "Date passed"}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-wash"><div className="h-full rounded-full" style={{ width: `${share}%`, background: PACE[p.pace] }} /></div>
                    <p className="num mt-1 text-xs text-muted">{inr0(g.saved_amount)} of {inr0(g.target_amount)} · {monthYear(g.target_date)}</p>
                  </li>
                );
              })}
            </ul>
          ) : <a href="/goals" className="mt-3 inline-block text-sm text-accent hover:underline">Add your first goal</a>}
        </section>

        <section className="card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">Key events</h2>
            <a href="/history" className="text-sm font-medium text-accent hover:underline">Insights</a>
          </div>
          {r && r.headlines.length ? (
            <ul className="mt-3 divide-y divide-line">
              {r.headlines.slice(0, 4).map((n, i) => (
                <li key={i} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="line-clamp-2 text-sm leading-snug">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{n.source}{newsDate(n.published) && ` · ${newsDate(n.published)}`}</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-muted">No headlines stored for this week.</p>}
        </section>
      </div>
    </div>
  );
}
