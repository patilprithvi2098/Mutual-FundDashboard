import { VERDICTS } from "@/lib/ledger";
import { initials, plainCategory, shortName } from "@/lib/names";
import { StatusPill, pctS, tone } from "./ui";
import Tip from "./Tip";
import type { ReactNode } from "react";

const HUE = ["var(--good)", "var(--warn)", "var(--bad)"];
const SOFT = ["var(--good-soft)", "var(--warn-soft)", "var(--bad-soft)"];

/** The verdict with all three possible states shown, the active one coloured. */
export function AssessmentCard({ assessment, reason, children }: { assessment: string; reason: string; children?: ReactNode }) {
  const active = VERDICTS.indexOf(assessment as (typeof VERDICTS)[number]);
  return (
    <section className="card p-5 lg:p-6">
      <p className="eyebrow">This week&apos;s verdict</p>
      <ol className="mt-3 grid grid-cols-3 gap-1.5" aria-label="The three possible verdicts">
        {VERDICTS.map((v, i) => (
          <li key={v} aria-current={i === active ? "true" : undefined}
            className="rounded-lg px-2 py-2 text-center text-[11px] font-medium leading-snug sm:text-xs"
            style={i === active ? { background: SOFT[i], color: HUE[i], boxShadow: `inset 0 0 0 1px ${HUE[i]}` } : { background: "var(--wash)", color: "var(--faint)" }}>
            {v}
          </li>
        ))}
      </ol>
      <h2 className="mt-5 text-[24px] font-semibold leading-tight tracking-tight lg:text-[28px]" style={active >= 0 ? { color: active === 0 ? "var(--ink)" : HUE[active] } : undefined}>{assessment}</h2>
      <p className="mt-2.5 text-[16px] leading-relaxed text-soft [text-wrap:pretty]">{reason}</p>
      {children}
    </section>
  );
}

type FundCardProps = {
  code: number; name: string; category: string; status: string; summary: string | null;
  fund1w: string | number | null; bench1w: string | number | null; cat1w: string | number | null; benchName: string | null; tag?: string; href?: string;
};
/** One fund in the weekly report: three 1-week numbers and Gemini's summary, always visible. */
export function FundCard(p: FundCardProps) {
  const cells: [string, string | number | null, ReactNode][] = [
    ["Your fund", p.fund1w, null],
    [p.benchName ?? "Benchmark", p.bench1w, <Tip key="b" term="benchmark" />],
    ["Category avg", p.cat1w, <Tip key="c" term="category" align="right" />],
  ];
  return (
    <article className="card p-5">
      <div className="flex items-start gap-3">
        <span className="badge">{initials(p.name)}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold leading-snug">{shortName(p.name)}{p.tag && <span className="ml-2 align-middle text-xs font-medium text-warn">{p.tag}</span>}</h3>
          <p className="text-sm text-muted">{plainCategory(p.category, p.name)}</p>
        </div>
        <StatusPill status={p.status} />
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-wash p-3">
        {cells.map(([label, v, tip]) => (
          <div key={label} className="min-w-0">
            <dt className="flex items-center text-[11px] leading-tight text-muted sm:text-xs">{label}{tip}</dt>
            <dd className={`num mt-0.5 text-[15px] font-semibold ${v == null ? "text-faint" : tone(v)}`}>{v == null ? "n/a" : pctS(v)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-[11px] text-faint">Returns over the past week.</p>
      <p className="mt-3 text-[15px] leading-relaxed text-soft [text-wrap:pretty]">{p.summary ?? "A written summary is not available for this week."}</p>
      {p.href && <a href={p.href} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">Chart and full returns &rarr;</a>}
    </article>
  );
}
