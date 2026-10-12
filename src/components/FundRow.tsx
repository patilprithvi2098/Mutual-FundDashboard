"use client";
import { useState, type ReactNode } from "react";
import { STATUS, pct } from "@/lib/ledger";

type Props = { name: string; status: string; fund1w: string | null; bench1w: string | null; summary: string; children?: ReactNode };

export default function FundRow({ name, status, fund1w, bench1w, summary, children }: Props) {
  const [open, setOpen] = useState(false);
  const s = STATUS[status] ?? STATUS.ok;
  const word = (
    <span className={`flex items-center gap-[7px] text-[13px] font-medium ${s.cls}`}>
      <span className="l-dot" />
      {s.word}
    </span>
  );
  return (
    <div className="border-t l-line">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_64px_76px] items-start gap-x-3 py-4 text-left lg:grid-cols-[minmax(0,1fr)_150px_80px_100px] lg:items-baseline lg:gap-x-4 lg:py-[18px]"
      >
        <span>
          <span className="block text-base font-medium leading-snug lg:text-[17px]">{name}</span>
          <span className="mt-[5px] block lg:hidden">{word}</span>
        </span>
        <span className="hidden lg:block">{word}</span>
        <span className="num text-right font-mono text-[15px] font-medium lg:text-base">{pct(fund1w)}</span>
        <span className="num l-muted text-right font-mono text-[15px] lg:text-base">{pct(bench1w)}</span>
      </button>
      {open && (
        <div className="pb-5 lg:pb-6">
          <p className="max-w-[560px] text-[15px] leading-relaxed l-soft [text-wrap:pretty] lg:text-base">{summary}</p>
          {children && <div className="mt-4">{children}</div>}
        </div>
      )}
    </div>
  );
}
