"use client";
import { useState } from "react";

/** Static comparison. Figures are rough long-run ranges written by hand, not live data, and no AI call is involved. */
const OPTIONS = [
  {
    name: "Equity",
    what: "Shares and equity mutual funds, like your index, mid-cap and small-cap funds.",
    returns: "Roughly 10% to 12% a year over 10 or more years, historically.",
    swings: "High. It can fall 20% to 40% in a bad year.",
    access: "You can sell on any working day and get the money in 1 to 3 days.",
    suits: "Goals that are at least 7 years away.",
  },
  {
    name: "Debt funds",
    what: "Funds that lend to governments and companies, like your short-term fund.",
    returns: "Roughly 6% to 8% a year.",
    swings: "Low to moderate. Prices move when interest rates change.",
    access: "Usually 1 to 2 working days.",
    suits: "Goals 1 to 3 years away, or a steadier part of a portfolio.",
  },
  {
    name: "Gold",
    what: "Gold ETFs and gold funds, rather than jewellery.",
    returns: "Roughly 8% to 10% a year over long periods, with long flat stretches.",
    swings: "Moderate. It often holds up when shares fall.",
    access: "ETFs and funds can be sold within days.",
    suits: "Spreading risk rather than driving growth.",
  },
  {
    name: "Real estate",
    what: "A flat, house or plot.",
    returns: "It varies widely by city, and price growth plus rent is often 5% to 9% a year.",
    swings: "Prices move slowly but can stall for years.",
    access: "Low. Selling can take months, and buying and selling costs are high.",
    suits: "A home to live in, or long-term holding with large capital.",
  },
  {
    name: "Fixed deposits",
    what: "Bank FDs at a fixed rate for a fixed term.",
    returns: "Roughly 6% to 7.5% a year, fixed when you open it.",
    swings: "Very low. Deposits are insured up to ₹5 lakh per bank by DICGC.",
    access: "You can break one early, usually with a small penalty.",
    suits: "Emergency money and short-term certainty. The interest is taxed at your slab rate.",
  },
];

const ROWS: [keyof (typeof OPTIONS)[number], string][] = [
  ["returns", "Typical return"],
  ["swings", "Ups and downs"],
  ["access", "Getting money out"],
  ["suits", "Often used for"],
];

/** Collapsible card in the same style as "How SIPs work". */
export default function MoneyComparison() {
  const [open, setOpen] = useState(false);
  return (
    <section className="l-card mt-6">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 px-[18px] py-4 text-left">
        <span className="block text-base font-semibold">Where else can money go?</span>
        <span className="l-plus" aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mx-[18px] border-t l-line pb-5 pt-4">
          <p className="l-muted text-sm leading-relaxed">Returns are rough historical ranges, not predictions.</p>
          <div className="mt-2">
            {OPTIONS.map((o) => (
              <div key={o.name} className="border-b py-4 last:border-b-0" style={{ borderColor: "oklch(0.3 0.012 255)" }}>
                <p className="font-semibold">{o.name}</p>
                <p className="l-muted mt-0.5 text-sm">{o.what}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  {ROWS.map(([k, label]) => (
                    <div key={k} className="grid grid-cols-[104px_minmax(0,1fr)] gap-x-3">
                      <dt className="l-faint font-mono text-[11px] uppercase leading-5 tracking-[0.04em]">{label}</dt>
                      <dd className="l-soft leading-snug">{o[k]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <p className="l-faint mt-3 text-xs leading-relaxed">
            This is general information, not financial advice. Past returns do not guarantee future returns, and taxes and costs differ by option.
          </p>
        </div>
      )}
    </section>
  );
}
