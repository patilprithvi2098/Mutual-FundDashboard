"use client";
import { useEffect, useId, useRef, useState } from "react";

export const TERMS = {
  benchmark: "A benchmark is an index that your fund tries to follow or beat, such as the Nifty Smallcap 250.",
  category: "The category average is the typical return of all funds of the same kind, so it shows how your fund compares with its closest peers.",
  ytd: "Year to date means the time from 1 January of this year until today.",
  rebased: "A rebased chart sets both lines to 100 on the first day, so you can compare them fairly even though their prices are different.",
} as const;

export default function Tip({ term, align = "left" }: { term: keyof typeof TERMS; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const mouse = (e: React.PointerEvent) => e.pointerType === "mouse";
  return (
    <span ref={ref} className="relative inline-flex align-middle normal-case tracking-normal" onPointerEnter={(e) => mouse(e) && setOpen(true)} onPointerLeave={(e) => mouse(e) && setOpen(false)}>
      <button
        type="button"
        aria-label={`What is ${term === "ytd" ? "year to date" : term === "rebased" ? "a rebased chart" : term === "category" ? "the category average" : "a benchmark"}?`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(e) => ((e.nativeEvent as PointerEvent).pointerType === "mouse" ? setOpen(true) : setOpen((o) => !o))}
        className="-my-3 -mr-1 ml-1 inline-flex cursor-pointer p-3"
      >
        <span className="l-q">?</span>
      </button>
      {open && (
        <span id={id} role="tooltip" className="l-pop" style={align === "right" ? { right: 0 } : { left: 0 }}>
          {TERMS[term]}
        </span>
      )}
    </span>
  );
}
