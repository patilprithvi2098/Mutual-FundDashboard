import { initials, plainCategory, shortName } from "@/lib/names";
import { StatusPill, pctS, tone } from "./ui";
import Tip from "./Tip";
import VerdictPills from "./VerdictPills";
import type { ReactNode } from "react";


/** The verdict card: three tappable verdicts, this week's headline and reason. */
export function AssessmentCard({ assessment, reason, children }: { assessment: string; reason: string; children?: ReactNode }) {
  return (
    <section className="card p-5 lg:p-6">
      <p className="eyebrow">This week&apos;s verdict</p>
      <div className="mt-3"><VerdictPills assessment={assessment} reason={reason}>{children}</VerdictPills></div>
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
            <dd className={`num mt-0.5 text-[15px] font-semibold ${v == null ? "text-muted" : tone(v)}`}>{v == null ? "n/a" : pctS(v)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-[11px] text-faint">Returns over the past week.</p>
      <p className="mt-3 text-[15px] leading-relaxed text-soft [text-wrap:pretty]">{p.summary ?? "A written summary is not available for this week."}</p>
      {p.href && <a href={p.href} className="mt-2 inline-block py-1 text-sm font-medium text-accent hover:underline">Chart and full returns &rarr;</a>}
    </article>
  );
}
