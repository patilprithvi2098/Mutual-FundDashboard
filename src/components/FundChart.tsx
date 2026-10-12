"use client";
import { useState } from "react";
import Tip from "./Tip";
import type { ChartData, Pt } from "@/lib/chart";

const PERIODS = [
  { k: "w", label: "1 week", phrase: "the past week" },
  { k: "m", label: "1 month", phrase: "the past month" },
  { k: "ytd", label: "Year to date", phrase: "the year so far" },
] as const;
const AHEAD = "oklch(0.8 0.12 155)", BEHIND = "oklch(0.82 0.12 80)";
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function geometry(pts: Pt[], W = 340, H = 200) {
  const n = pts.length, pl = 34, pr = 50, pt = 12, pb = 8;
  const hasB = pts.every((p) => p.b != null);
  const all = pts.map((p) => p.f).concat(hasB ? pts.map((p) => p.b as number) : []);
  const lo = Math.floor(Math.min(...all, 100) - 0.5), hi = Math.ceil(Math.max(...all, 100) + 0.5);
  const step = Math.max(1, Math.ceil((hi - lo) / 4)), k = Math.ceil((hi - lo) / step), top = lo + step * k;
  const X = (i: number) => pl + (i / (n - 1)) * (W - pl - pr), Y = (v: number) => pt + ((top - v) / (top - lo)) * (H - pt - pb);
  const ticks = Array.from({ length: k + 1 }, (_, j) => lo + step * j).filter((v) => v !== 100);
  const segs = !hasB ? [] : pts.slice(0, -1).map((p, i) => {
    const q = pts[i + 1], behind = p.f + q.f - (p.b as number) - (q.b as number) < 0;
    const poly = [[i, p.f], [i + 1, q.f], [i + 1, q.b as number], [i, p.b as number]].map(([a, b]) => `${X(a).toFixed(1)},${Y(b).toFixed(1)}`).join(" ");
    return { poly, fill: behind ? "oklch(0.82 0.12 80 / 0.32)" : "oklch(0.8 0.12 155 / 0.32)" };
  });
  const line = (g: (p: Pt) => number) => pts.map((p, i) => `${X(i).toFixed(1)},${Y(g(p)).toFixed(1)}`).join(" ");
  const last = pts[n - 1];
  let fy = Y(last.f) + 4, by = hasB ? Y(last.b as number) + 4 : 0;
  if (hasB && Math.abs(fy - by) < 13) { if (fy < by) { fy -= 6; by += 6; } else { fy += 6; by -= 6; } }
  return { W, H, pl, pr, ticks, Y, segs, fl: line((p) => p.f), bl: hasB ? line((p) => p.b as number) : "", hasB, fy, by, last, xl: [pts[0].d, pts[Math.floor((n - 1) / 2)].d, last.d] };
}

export default function FundChart({ data, fundName }: { data: ChartData; fundName: string }) {
  const [p, setP] = useState<"w" | "m" | "ytd">("m");
  const per = PERIODS.find((x) => x.k === p)!;
  const pts = data[p];
  const g = pts.length >= 3 ? geometry(pts) : null;
  const gap = g && g.hasB ? g.last.f - (g.last.b as number) : 0;
  let sentence = "There is not enough price history yet to draw this chart.";
  if (g && !g.hasB) sentence = `Over ${per.phrase}, \u20B9100 in your fund has become \u20B9${g.last.f.toFixed(2)}. This fund has no benchmark to compare against.`;
  if (g && g.hasB)
    sentence = Math.abs(gap) < 0.05
      ? `Over ${per.phrase}, your fund is level with its benchmark, and \u20B9100 has become \u20B9${g.last.f.toFixed(2)}.`
      : `Over ${per.phrase}, your fund is ${gap > 0 ? "ahead of" : "behind"} its benchmark by ${Math.abs(gap).toFixed(1)} points, which means \u20B9100 has become \u20B9${g.last.f.toFixed(2)} instead of \u20B9${(g.last.b as number).toFixed(2)}.`;
  const tone = gap >= 0 ? AHEAD : BEHIND;
  return (
    <div>
      <p className="l-muted text-sm leading-relaxed">
        Both lines start at 100, so the space between them is the gap.<Tip term="rebased" />
      </p>
      <div role="group" aria-label="Chart period" className="mt-3 flex gap-0.5 rounded-lg p-[3px] lg:max-w-sm" style={{ background: "oklch(0.26 0.012 255)" }}>
        {PERIODS.map((x) => (
          <button key={x.k} type="button" aria-pressed={p === x.k} onClick={() => setP(x.k)} className="min-h-[40px] flex-1 cursor-pointer rounded-md px-1 text-sm font-medium" style={{ background: p === x.k ? "oklch(0.4 0.014 255)" : "transparent", color: p === x.k ? "oklch(0.98 0.004 255)" : "oklch(0.78 0.008 255)" }}>
            {x.label}
          </button>
        ))}
      </div>
      {p === "ytd" && <p className="l-muted mt-2 text-[13px]">Showing the year to date.<Tip term="ytd" /></p>}
      {g && (
        <>
          <svg viewBox={`0 0 ${g.W} ${g.H}`} role="img" aria-label={`${fundName} against its benchmark, ${per.label}`} className="mt-4 block w-full lg:max-w-[640px]">
            {g.ticks.map((v) => (<g key={v}><line x1={g.pl} x2={g.W - g.pr} y1={g.Y(v)} y2={g.Y(v)} stroke="oklch(0.3 0.012 255)" strokeWidth={1} /><text x={0} y={g.Y(v) + 3.5} fill="oklch(0.68 0.01 255)" style={{ font: "400 10px var(--font-geist-mono), monospace" }}>{v}</text></g>))}
            <line x1={g.pl} x2={g.W - g.pr} y1={g.Y(100)} y2={g.Y(100)} stroke="oklch(0.5 0.012 255)" strokeWidth={1} />
            <text x={0} y={g.Y(100) + 3.5} fill="oklch(0.85 0.006 255)" style={{ font: "500 10px var(--font-geist-mono), monospace" }}>100</text>
            {g.segs.map((s, i) => (<polygon key={i} points={s.poly} fill={s.fill} stroke={s.fill} strokeWidth={0.6} />))}
            {g.hasB && <polyline points={g.bl} fill="none" stroke="oklch(0.7 0.01 255)" strokeWidth={1.5} strokeDasharray="4 3" />}
            <polyline points={g.fl} fill="none" stroke="oklch(0.97 0.004 255)" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
            <text x={g.W - g.pr + 6} y={g.fy} fill="oklch(0.97 0.004 255)" style={{ font: "500 11px var(--font-geist-mono), monospace" }}>{g.last.f.toFixed(1)}</text>
            {g.hasB && <text x={g.W - g.pr + 6} y={g.by} fill="oklch(0.74 0.01 255)" style={{ font: "400 11px var(--font-geist-mono), monospace" }}>{(g.last.b as number).toFixed(1)}</text>}
          </svg>
          <div className="l-faint mt-1.5 flex justify-between font-mono text-[11px] lg:max-w-[640px]" style={{ margin: "6px 50px 0 34px" }}>{g.xl.map((d, i) => (<span key={i}>{day(d)}</span>))}</div>
          <div className="l-soft mt-4 flex flex-col gap-2 text-[13px]">
            <span className="flex items-center gap-2.5"><span style={{ width: 20, borderTop: "2.25px solid oklch(0.97 0.004 255)" }} />{fundName}</span>
            {g.hasB && (<>
              <span className="flex items-center gap-2.5"><span style={{ width: 20, borderTop: "1.5px dashed oklch(0.7 0.01 255)" }} />Its benchmark</span>
              <span className="flex items-center gap-2.5"><span style={{ width: 20, height: 10, background: "oklch(0.82 0.12 80 / 0.35)" }} />Your fund is behind</span>
              <span className="flex items-center gap-2.5"><span style={{ width: 20, height: 10, background: "oklch(0.8 0.12 155 / 0.35)" }} />Your fund is ahead</span>
            </>)}
          </div>
        </>
      )}
      <p className="mt-5 border-t l-line pt-4 text-[17px] font-medium leading-normal [text-wrap:pretty]" style={{ color: g && g.hasB ? tone : undefined }}>{sentence}</p>
    </div>
  );
}
