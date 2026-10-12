"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type P = { d: string; value: number; invested: number };
const RANGES = [["1M", 1], ["3M", 3], ["6M", 6], ["1Y", 12], ["All", 0]] as const;
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const back = (iso: string, months: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() - months); return d.toISOString().slice(0, 10); };

/** Counts up from 92% of the value once, unless the reader prefers reduced motion. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    done.current = true;
    const t0 = performance.now(), from = value * 0.92;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3);
      setShown(from + (value - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{inr(shown)}</span>;
}

/** Portfolio value over time: one area series, invested amount as a thin dashed reference, hover crosshair. */
export default function ValueChart({ series }: { series: P[] }) {
  const [r, setR] = useState<(typeof RANGES)[number][0]>("1Y");
  const [hover, setHover] = useState<number | null>(null);
  const pts = useMemo(() => {
    const months = RANGES.find((x) => x[0] === r)![1];
    if (!months || !series.length) return series;
    const from = back(series[series.length - 1].d, months);
    return series.filter((p) => p.d >= from);
  }, [r, series]);
  const W = 640, H = 200, pt = 10, pb = 6;
  if (pts.length < 2) return <p className="text-sm text-muted">Not enough history to draw this chart yet.</p>;
  const vals = pts.flatMap((p) => [p.value, p.invested]);
  // All-zero SIP amounts give a flat zero series; say so instead of dividing by a zero range.
  if (Math.max(...vals) <= 0) return <p className="text-sm text-muted">No SIP amounts set yet. Add them on <a href="/funds" className="font-medium text-accent hover:underline">Manage funds</a> to see the value over time.</p>;
  const lo = Math.min(...vals) * 0.98, hi = Math.max(...vals) * 1.01 || 1;
  const X = (i: number) => (i / (pts.length - 1)) * W;
  const Y = (v: number) => pt + ((hi - v) / (hi - lo)) * (H - pt - pb);
  const line = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join(" ");
  const inv = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.invested).toFixed(1)}`).join(" ");
  const first = pts[0], last = pts[pts.length - 1];
  const chg = first.value ? (last.value - last.invested - (first.value - first.invested)) : 0;
  const h = hover != null ? pts[hover] : null;

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(pts.length - 1, Math.round(((e.clientX - b.left) / b.width) * (pts.length - 1)))));
  };
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Gain over this period{" "}
          <span className={`num font-medium ${chg >= 0 ? "text-good" : "text-bad"}`}>{chg >= 0 ? "+" : "−"}{inr(Math.abs(chg))}</span>
        </p>
        <div className="seg w-full sm:w-auto" role="group" aria-label="Chart period">
          {RANGES.map(([k]) => (<button key={k} type="button" aria-pressed={r === k} onClick={() => setR(k)}>{k}</button>))}
        </div>
      </div>
      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[180px] w-full touch-none lg:h-[220px]" role="img"
          aria-label={`Portfolio value from ${day(first.d)} to ${day(last.d)}: ${inr(first.value)} to ${inr(last.value)}`}
          onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="vc-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.16" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (<line key={f} x1={0} x2={W} y1={pt + f * (H - pt - pb)} y2={pt + f * (H - pt - pb)} stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />))}
          <polygon points={`0,${H} ${line} ${W},${H}`} fill="url(#vc-fill)" />
          <polyline points={inv} fill="none" stroke="var(--faint)" strokeWidth={1.25} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {h && <line x1={X(hover!)} x2={X(hover!)} y1={0} y2={H} stroke="var(--line-strong)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        </svg>
        {h && (
          <div className="pointer-events-none absolute top-1 z-10 rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-lg"
            style={{ left: `${(hover! / (pts.length - 1)) * 100}%`, transform: `translateX(${hover! > pts.length / 2 ? "-105%" : "5%"})` }}>
            <p className="text-muted">{day(h.d)}</p>
            <p className="num mt-0.5 font-semibold text-ink">{inr(h.value)}</p>
            <p className="num text-muted">Invested {inr(h.invested)}</p>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-faint"><span>{day(first.d)}</span><span>{day(last.d)}</span></div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-2"><span className="inline-block w-5 border-t-2 border-accent" />Portfolio value</span>
        <span className="flex items-center gap-2"><span className="inline-block w-5 border-t border-dashed" style={{ borderColor: "var(--faint)" }} />Amount invested</span>
      </div>
    </div>
  );
}
