"use client";
import { useState } from "react";

export default function SipCard() {
  const [open, setOpen] = useState(false);
  return (
    <section className="l-card mt-14">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 px-[18px] py-4 text-left">
        <span className="block text-base font-semibold">How SIPs work</span>
        <span className="l-plus" aria-hidden>{open ? "\u2212" : "+"}</span>
      </button>
      {open && (
        <div className="l-soft flex flex-col gap-3 border-t l-line mx-[18px] pb-5 pt-4 text-[15px] leading-relaxed [text-wrap:pretty]">
          <p>A SIP moves a fixed amount from your bank account into a fund on the same date every month.</p>
          <p>Because the amount stays the same, you buy more units when prices are low and fewer units when prices are high.</p>
          <p>This is why one bad week matters little, since the plan is built to keep running for years.</p>
        </div>
      )}
    </section>
  );
}
