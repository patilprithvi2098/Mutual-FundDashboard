export const metadata = { title: "Components map" };

type Kind = "people" | "ai" | "sys" | "human";
const cols = ["Trigger", "Input", "Context", "Processing", "Output"] as const;

const rows: { label: string; kind: Kind; cells: Partial<Record<(typeof cols)[number], string>> }[] = [
  { label: "Meera", kind: "people", cells: { Trigger: "Opens Saturday report", Input: "Adds or removes a scheme code; sets SIP amounts and goals", Output: "Reads the overview and the weekly report" } },
  { label: "Vercel Cron", kind: "sys", cells: { Trigger: "Daily NAV pull; Saturday 8:00 IST report" } },
  { label: "Fund form", kind: "sys", cells: { Input: "Validates code, adds or removes fund" } },
  { label: "MF data (mfapi.in)", kind: "sys", cells: { Input: "Daily NAV for each fund", Context: "NAVs of category peers" } },
  { label: "Index data (Yahoo Finance)", kind: "sys", cells: { Context: "Nifty 50, Midcap 150, Smallcap 250; Nasdaq 100 for the US fund" } },
  { label: "News (Google News RSS)", kind: "sys", cells: { Context: "Week's market and macro headlines" } },
  { label: "Rules engine", kind: "sys", cells: { Processing: "1W, 1M, YTD returns; gap to benchmark and category; three flagged weeks escalate; verdict" } },
  { label: "Gemini Flash", kind: "ai", cells: { Processing: "Explains market-wide vs fund-specific gap", Output: "3-sentence fund summaries, verdict reason, market summary" } },
  { label: "Supabase Postgres", kind: "sys", cells: { Context: "Funds, NAV and index history, past snapshots, goals, SIPs", Output: "Weekly snapshot and report stored" } },
  { label: "Web dashboard", kind: "sys", cells: { Output: "Overview, weekly report, fund pages, insights, goals" } },
  { label: "Meera as reviewer", kind: "human", cells: { Processing: "Reviews fund if flagged 'Consider reviewing'" } },
];

const style: Record<Kind, string> = {
  people: "border-indigo-700 bg-indigo-50 text-indigo-800",
  ai: "border-emerald-700 bg-emerald-50 text-emerald-800",
  sys: "border-stone-500 bg-stone-100 text-stone-700",
  human: "border-red-700 bg-red-50 text-red-800",
};

export default function ComponentsMap() {
  return (
    <div className="space-y-4">
      <h1 className="text-[26px] font-semibold tracking-tight lg:text-[30px]">How it&apos;s built</h1>
      <p className="max-w-[680px] text-[15px] text-muted">The components map submitted with the assignment: who or what triggers each step, and where the AI, the rules and the human sit.</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card p-5" tabIndex={0} role="region" aria-label="Components map, scrolls sideways on small screens">
        <div className="grid min-w-[860px] grid-cols-[170px_repeat(5,1fr)] gap-x-3">
          <div />
          {cols.map((c) => <div key={c} className="pb-3 text-center text-sm text-muted">{c}</div>)}
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <div className="flex items-center border-t border-line py-2 pr-2 text-sm font-semibold">{r.label}</div>
              {cols.map((c) => (
                <div key={c} className="border-t border-line p-1.5">
                  {r.cells[c] && <div className={`flex h-full min-h-14 items-center justify-center rounded-lg border-2 px-2 py-2 text-center text-xs leading-snug ${style[r.kind]}`}>{r.cells[c]}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-5 border-t border-line pt-4 text-sm">
          {([["people", "People"], ["ai", "AI"], ["sys", "Data and systems"], ["human", "Human takes over"]] as [Kind, string][]).map(([k, l]) => (
            <span key={k} className="flex items-center gap-2"><span className={`inline-block h-4 w-4 rounded border-2 ${style[k]}`} />{l}</span>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-semibold">Deviations from the brief</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
          <li>The small-cap index is the Nifty Smallcap 250, not the Smallcap 100, because no free source returns Smallcap 100 history. The Smallcap 250 is also the official benchmark of Nippon India Small Cap.</li>
          <li>The short-term debt fund has no free benchmark index feed, so it is compared with its category average only.</li>
          <li>Benchmarks are price indices rather than total-return indices, and the Nasdaq 100 fund of funds is compared in US dollars.</li>
          <li>The verdict is decided by fixed rules in code, and Gemini Flash writes the explanation. If Gemini fails, rule-based text is shown and marked as such.</li>
          <li>The report is delivered on this website every Saturday morning by a scheduled job, rather than by email.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="font-semibold">Added beyond the brief</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
          <li>An overview that values Meera&apos;s monthly SIPs at real NAVs, with a performance chart and allocation. The SIP amounts are illustrative and editable on Manage funds.</li>
          <li>Goals with SIP projections at 8% to 12% a year, and a pace label for each goal.</li>
          <li>A worked example of a warning, built by running the real rules and one real Gemini call on simulated numbers, so the warning path can be seen without waiting for a bad week.</li>
          <li>Past weeks were backfilled from stored NAV history by the same rules, so Insights shows 12 weeks of status.</li>
          <li>Regenerating the report by hand needs an admin passcode, so visitors cannot spend the Gemini quota. Cron routes need a secret.</li>
          <li>Light and dark mode, and tappable verdicts that explain the rule behind each one.</li>
        </ul>
      </section>
    </div>
  );
}
