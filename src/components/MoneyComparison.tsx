/** Static comparison. Figures are rough long-run ranges written by hand, not live data, and no AI call is involved. */
const OPTIONS = [
  {
    name: "Equity",
    what: "Shares and equity mutual funds, like your index, mid-cap and small-cap funds",
    returns: "Roughly 10% to 12% a year over 10+ years, historically",
    swings: "High. Can fall 20% to 40% in a bad year",
    access: "Sell on any working day; money in 1 to 3 days",
    suits: "Goals at least 7 years away",
  },
  {
    name: "Debt funds",
    what: "Funds that lend to governments and companies, like your short-term fund",
    returns: "Roughly 6% to 8% a year",
    swings: "Low to moderate. Prices move when interest rates change",
    access: "Usually 1 to 2 working days",
    suits: "Goals 1 to 3 years away, or a steadier part of a portfolio",
  },
  {
    name: "Gold",
    what: "Gold ETFs and gold funds, rather than jewellery",
    returns: "Roughly 8% to 10% a year over long periods, with long flat stretches",
    swings: "Moderate. Often holds up when shares fall",
    access: "ETFs and funds sell within days",
    suits: "Spreading risk rather than driving growth",
  },
  {
    name: "Real estate",
    what: "A flat, house or plot",
    returns: "Varies widely by city; price growth plus rent is often 5% to 9% a year",
    swings: "Prices move slowly but can stall for years",
    access: "Low. Selling can take months, and buying and selling costs are high",
    suits: "A home to live in, or long-term holding with large capital",
  },
  {
    name: "Fixed deposits",
    what: "Bank FDs at a fixed rate for a fixed term",
    returns: "Roughly 6% to 7.5% a year, fixed when you open it",
    swings: "Very low. Deposits are insured up to ₹5 lakh per bank (DICGC)",
    access: "Can break early, usually with a small penalty",
    suits: "Emergency money and short-term certainty; interest is taxed at your slab rate",
  },
];

const ROWS: [keyof (typeof OPTIONS)[number], string][] = [
  ["returns", "Typical return"],
  ["swings", "Ups and downs"],
  ["access", "Getting money out"],
  ["suits", "Often used for"],
];

export default function MoneyComparison() {
  return (
    <details className="group mt-14 border-t border-b l-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-lg font-semibold lg:text-xl [&::-webkit-details-marker]:hidden">
        Where else can money go?
        <span aria-hidden className="font-mono text-base l-faint transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="pb-6">
        <p className="max-w-[620px] text-sm leading-relaxed l-muted lg:text-[15px]">
          How your mutual funds compare with other common choices. Returns are rough historical ranges, not predictions.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {OPTIONS.map((o) => (
            <div key={o.name} className="rounded-lg border l-line p-4">
              <p className="font-medium">{o.name}</p>
              <p className="mt-0.5 text-sm l-muted">{o.what}</p>
              <dl className="mt-3 space-y-2 text-sm">
                {ROWS.map(([k, label]) => (
                  <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3">
                    <dt className="font-mono text-[11px] uppercase leading-5 tracking-[0.04em] l-faint">{label}</dt>
                    <dd className="leading-snug l-soft">{o[k]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed l-faint">
          This is general information, not financial advice. Past returns do not guarantee future returns, and taxes and costs differ by option.
        </p>
      </div>
    </details>
  );
}
