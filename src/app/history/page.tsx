import { history } from "@/lib/queries";
import { sipSplit } from "@/lib/holdings";
import { listSips } from "@/lib/goals";
import { q } from "@/lib/db";
import { shortDate, STATUS } from "@/lib/ledger";

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
    return { ...f, cells, have, last, run };
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
    ? `${biggest.name} receives the largest share of your monthly SIPs, at ${biggest.pct} percent. These are sample SIP amounts, which you can change on the Goals page.`
    : "Your funds are shown with equal shares here, because your SIP amounts have not been added yet. You can add them on the Goals page.";
  const shade = [0.9, 0.78, 0.66, 0.54, 0.42, 0.34, 0.3];

  return (
    <div className="ledger">
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[380px_minmax(0,1fr)]">
        <header className="self-start lg:sticky lg:top-8">
          <h1 className="text-[32px] font-semibold leading-[1.12] tracking-tight lg:text-[38px]">The last {weeks.length} weeks</h1>
          <p className="l-soft mt-3.5 text-[17px] leading-relaxed [text-wrap:pretty] lg:text-lg">{lead}</p>
          <p className="l-muted mt-3 text-sm leading-relaxed [text-wrap:pretty]">{provenance}</p>
          <div className="l-soft mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            {(["ok", "watch", "review"] as const).map((k) => (<span key={k} className="flex items-center gap-2"><span className="l-swatch" style={{ background: HUE[k] }} />{STATUS[k].word}</span>))}
            <span className="flex items-center gap-2"><span className="l-swatch" style={{ background: "oklch(0.42 0.012 255)" }} />Not enough history</span>
          </div>
        </header>

        <div>
          {rows.map((r) => (
            <section key={r.scheme_code} className="border-t l-line py-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-medium lg:text-[17px]">{r.name}</h2>
                <span className="text-[13px] font-medium" style={{ color: r.have >= 4 && r.last ? HUE[r.last] : "oklch(0.74 0.01 255)" }}>{r.have >= 4 && r.last ? STATUS[r.last].word : "Not enough history yet"}</span>
              </div>
              <div className="mt-3 flex gap-[3px] lg:gap-1">
                {r.cells.map((c, i) => (
                  <div key={i} title={`Week ending ${shortDate(weeks[i])}: ${c ? STATUS[c].word : "no data"}`} className="h-8 flex-1 rounded-[3px] lg:h-9"
                    style={c ? { background: r.have >= 4 ? HUE[c] : "oklch(0.42 0.012 255)" } : { border: "1px dashed oklch(0.45 0.012 255)" }} />
                ))}
              </div>
              <div className="l-faint mt-1.5 flex justify-between font-mono text-[11px]"><span>{shortDate(weeks[0])}</span><span>THIS WEEK</span></div>
              {r.have >= 4 && r.last ? (
                <p className="l-muted mt-2.5 text-sm">It has been {WORD[r.last]} {r.run === weeks.length ? "for all " + weeks.length + " weeks" : r.run === 1 ? "for the past week" : "for " + r.run + " weeks in a row"}.</p>
              ) : (
                <div className="mt-3.5 max-w-[600px] rounded-lg p-4" style={{ background: "oklch(0.25 0.012 255)" }}>
                  <p className="text-[15px] font-semibold">We are still getting to know this fund.</p>
                  <p className="l-soft mt-1.5 text-sm leading-relaxed [text-wrap:pretty]">
                    {r.name} has {r.have === 0 ? "less than a week" : r.have === 1 ? "one week" : r.have + " weeks"} of history so far, and we need four weeks before we can give it a status. Nothing is wrong, and your SIP is running as planned. Its weekly status will appear as soon as it has four weeks of history.
                  </p>
                </div>
              )}
            </section>
          ))}
          <div className="border-t l-line" />

          <section className="mt-14">
            <h2 className="text-lg font-semibold lg:text-xl">How your money is split</h2>
            <p className="l-muted mt-1.5 text-sm leading-relaxed lg:text-[15px]">{splitSentence}</p>
            <div className="mt-5 flex h-7 gap-0.5 lg:h-8">
              {split.map((s, i) => (<div key={s.scheme_code} style={{ flex: `${Math.max(s.pct, 1)} 1 0`, background: `oklch(${shade[i % shade.length]} 0.025 255)`, borderRadius: 2 }} />))}
            </div>
            <div className="mt-3">
              {split.map((s, i) => (
                <div key={s.scheme_code} className="grid grid-cols-[12px_minmax(0,1fr)_auto_44px] items-center gap-x-3 border-b py-3 text-sm lg:text-[15px]" style={{ borderColor: "oklch(0.3 0.012 255)" }}>
                  <span className="l-swatch" style={{ background: `oklch(${shade[i % shade.length]} 0.025 255)` }} />
                  <span>{s.name}</span>
                  <span className="l-muted font-mono text-[13px]">{s.amount != null ? inr(s.amount) + " a month" : ""}</span>
                  <span className="num text-right font-mono font-medium">{s.pct}%</span>
                </div>
              ))}
            </div>
            {total != null && (<div className="mt-3.5 flex justify-between text-sm"><span className="l-muted">Total monthly SIPs</span><span className="num font-mono font-medium">{inr(total)}</span></div>)}
          </section>
        </div>
      </div>
    </div>
  );
}
