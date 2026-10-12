export const metadata = { title: "Components map" };

type Kind = "people" | "ai" | "sys" | "human";
const cols = ["Trigger", "Input", "Context", "Processing", "Output"] as const;

const rows: { label: string; kind: Kind; cells: Partial<Record<(typeof cols)[number], string>> }[] = [
  { label: "Meera", kind: "people", cells: { Trigger: "Opens Saturday report", Input: "Enters or removes a scheme code", Output: "Reads plain-language report" } },
  { label: "Vercel Cron", kind: "sys", cells: { Trigger: "Daily NAV pull; Saturday 8:00 IST report" } },
  { label: "Fund form", kind: "sys", cells: { Input: "Validates code, adds or removes fund" } },
  { label: "MF data (mfapi.in)", kind: "sys", cells: { Input: "Daily NAV for each fund", Context: "NAVs of category peers" } },
  { label: "Index data (Yahoo Finance)", kind: "sys", cells: { Context: "Nifty 50, Midcap 150, Smallcap 250" } },
  { label: "News (Google News RSS)", kind: "sys", cells: { Context: "Week's market and macro headlines" } },
  { label: "Rules engine", kind: "sys", cells: { Processing: "1W, 1M, YTD returns; benchmark and category gap; verdict" } },
  { label: "Gemini Flash", kind: "ai", cells: { Processing: "Explains market-wide vs fund-specific gap", Output: "3-sentence fund summaries, verdict reason" } },
  { label: "Neon Postgres", kind: "sys", cells: { Context: "Fund list, past snapshots", Output: "Weekly snapshot stored" } },
  { label: "Web dashboard", kind: "sys", cells: { Output: "Report, trends, manage funds" } },
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
      <h1 className="text-2xl font-semibold">Components map</h1>
      <div className="overflow-x-auto rounded-2xl border border-line bg-card p-5">
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
    </div>
  );
}
