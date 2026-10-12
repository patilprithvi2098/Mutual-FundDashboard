import { history } from "@/lib/queries";
import { sipSplit } from "@/lib/holdings";
import { listSips } from "@/lib/goals";
import { q } from "@/lib/db";
import { shortDate, STATUS } from "@/lib/ledger";
import { shortName, streak } from "@/lib/portfolio";
import { PageHead } from "@/components/ui";

export const dynamic = "force-dynamic";

const WORD: Record<string, string> = { ok: "on track", watch: "worth watching", review: "in review" };
const HUE: Record<string, string> = { ok: "var(--l-ok)", watch: "var(--l-watch)", review: "var(--l-review)" };
const inr = (n: number) => "\u20B9" + n.toLocaleString("en-IN");

export default async function Trends() {
  const snaps = await history();
  if (!snaps.length) return <p className="text-muted">No weekly snapshots yet. Generate a report from the home page.</p>;
  const weeks = [...new Set(snaps.map((s) => s.week_ending))].sort().slice(-12);
  const funds = [...new Map(snaps.map((s) => [s.scheme_code, s.fund_name])).entries()].map(([scheme_code, name]) => ({ scheme_code, name }));

  const rows = funds.map((f) => {
    const mine = new Map(snaps.filter((s) => s.scheme_code === f.scheme_code).map((s) => [s.week_ending, s.status]));
    const cells = weeks.map((w) => mine.get(w) ?? null);
    const have = cells.filter(Boolean).length;
    const last = [...cells].reverse().find(Boolean) ?? null;
    let run = 0;
    for (let i = cells.length - 1; i >= 0 && cells[i] === last; i--) run++;
    const mineRows = snaps.filter((s) => s.scheme_code === f.scheme_code).sort((a, b) => a.week_ending.localeCompare(b.week_ending)).slice(-12);
    const yard = mineRows.some((s) => s.bench_1w != null) ? "its benchmark" : "its category average";
    const st = streak(mineRows.map((s) => ({ fund: s.ret_1w == null ? null : Number(s.ret_1w), yard: s.bench_1w != null ? Number(s.bench_1w) : s.cat_1w != null ? Number(s.cat_1w) : null })));
    return { ...f, cells, have, last, run, yard, st };
  });

  const stuck = rows.filter((r) => r.have >= 4 && r.last && r.last !== "ok" && r.run >= 3);
  const lead = stuck.length
    ? stuck.map((r) => `${r.name} has been ${WORD[r.last!]} for ${r.run} weeks in a row.`).join(" ") + " Your other funds with enough history have stayed mostly on track."
    : "None of your funds has spent three weeks in a row away from on track.";

  const sips = await listSips().catch(() => []);
  const [{ n: aiWeeks }] = await q<{ n: number }>(`select count(*)::int n from reports where ai_used`);
  const provenance = `${aiWeeks} of these weeks ${aiWeeks === 1 ? "was" : "were"} written with Gemini. The earlier weeks were rebuilt from stored NAV history by the same rules, without AI commentary.`;
  const { rows: split, configured, total } = sipSplit(funds, Object.fromEntries(sips.map((s) => [s.scheme_code, s.monthly_amount])));
  const biggest = [...split].sort((a, b) => b.pct - a.pct)[0];
  const splitSentence = configured
    ? `${shortName(biggest.name)} receives the largest share of your monthly SIPs, at ${biggest.pct} percent. These are sample SIP amounts, which you can change on the Goals page.`
    : "Your funds are shown with equal shares here, because your SIP amounts have not been added yet. You can add them on the Goals page.";
  const shade = ["#3730a3", "#6366f1", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#94a3b8", "#cbd5e1"];

  return (
    <div className="ledger space-y-8">
      <PageHead eyebrow={`The last ${weeks.length} weeks`} title="Insights">
        <p className="text-[16px] text-soft">{lead}</p>
        <p className="mt-2 text-sm">{provenance}</p>
      </PageHead>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-soft">
        {(["ok", "watch", "review"] as const).map((k) => (<span key={k} className="flex items-center gap-2"><span className="l-swatch" style={{ background: HUE[k] }} />{STATUS[k].word}</span>))}
        <span className="flex items-center gap-2"><span className="l-swatch" style={{ background: "var(--line-strong)" }} />Not enough history</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((r) => (
            <section key={r.scheme_code} className="card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold lg:text-[17px]"><a href={`/fund/${r.scheme_code}`} className="hover:underline">{shortName(r.name)}</a></h2>
                <span className="text-[13px] font-medium" style={{ color: r.have >= 4 && r.last ? HUE[r.last] : "var(--faint)" }}>{r.have >= 4 && r.last ? STATUS[r.last].word : "Not enough history yet"}</span>
              </div>
              <div className="mt-3 flex gap-[3px] lg:gap-1">
                {r.cells.map((c, i) => (
                  <div key={i} title={`Week ending ${shortDate(weeks[i])}: ${c ? STATUS[c].word : "no data"}`} className="h-8 flex-1 rounded-[3px] lg:h-9"
                    style={c ? { background: r.have >= 4 ? HUE[c] : "var(--line-strong)" } : { border: "1px dashed var(--line-strong)" }} />
                ))}
              </div>
              <div className="l-faint mt-1.5 flex justify-between font-mono text-[11px]"><span>{shortDate(weeks[0])}</span><span>THIS WEEK</span></div>
              {r.have >= 4 && r.last ? (
                <p className="l-muted mt-2.5 text-sm">It has been {WORD[r.last]} {r.run === weeks.length ? "for all " + weeks.length + " weeks" : r.run === 1 ? "for the past week" : "for " + r.run + " weeks in a row"}.</p>
              ) : (
                <div className="mt-3.5 rounded-xl bg-wash p-4">
                  <p className="text-[15px] font-semibold">We are still getting to know this fund.</p>
                  <p className="l-soft mt-1.5 text-sm leading-relaxed [text-wrap:pretty]">
                    {r.name} has {r.have === 0 ? "less than a week" : r.have === 1 ? "one week" : r.have + " weeks"} of history so far, and we need four weeks before we can give it a status. Nothing is wrong, and your SIP is running as planned. Its weekly status will appear as soon as it has four weeks of history.
                  </p>
                </div>
              )}
              {r.st.total > 0 && (
                <p className="l-soft mt-2 text-sm leading-relaxed">
                  {r.st.last === "ahead" ? "Ahead of" : "Behind"} {r.yard} for {r.st.run === 1 ? "the past week" : `${r.st.run} weeks in a row`}, and ahead in {r.st.ahead} of the last {r.st.total} weeks.
                </p>
              )}
            </section>
          ))}
      </div>

          <section className="card p-5 lg:p-6">
            <h2 className="text-lg font-semibold">How your money is split</h2>
            <p className="l-muted mt-1.5 text-sm leading-relaxed lg:text-[15px]">{splitSentence}</p>
            <div className="mt-5 flex h-7 gap-0.5 lg:h-8">
              {split.map((s, i) => (<div key={s.scheme_code} style={{ flex: `${Math.max(s.pct, 1)} 1 0`, background: shade[i % shade.length], borderRadius: 3 }} />))}
            </div>
            <div className="mt-3">
              {split.map((s, i) => (
                <div key={s.scheme_code} className="grid grid-cols-[12px_minmax(0,1fr)_auto_44px] items-center gap-x-3 border-b border-line py-3 text-sm lg:text-[15px]">
                  <span className="l-swatch" style={{ background: shade[i % shade.length] }} />
                  <span>{shortName(s.name)}</span>
                  <span className="l-muted font-mono text-[13px]">{s.amount != null ? inr(s.amount) + " a month" : ""}</span>
                  <span className="num text-right font-mono font-medium">{s.pct}%</span>
                </div>
              ))}
            </div>
            {total != null && (<div className="mt-3.5 flex justify-between text-sm"><span className="l-muted">Total monthly SIPs</span><span className="num font-mono font-medium">{inr(total)}</span></div>)}
          </section>
    </div>
  );
}
