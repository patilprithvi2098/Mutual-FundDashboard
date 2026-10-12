import { PageHead } from "@/components/ui";

export const metadata = { title: "More · Meera's Wealth" };

const LINKS = [
  { href: "/goals", title: "Goals", text: "Savings goals with SIP projections and sample SIP amounts." },
  { href: "/funds", title: "Manage funds", text: "Add or remove a fund by its scheme code." },
  { href: "/example", title: "Example warning", text: "What the report looks like when a fund needs attention." },
  { href: "/components-map", title: "How it's built", text: "The components map and deviations from the brief." },
];

export default function More() {
  return (
    <div className="space-y-6">
      <PageHead title="More" />
      <div className="card divide-y divide-line">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-wash">
            <span><span className="block text-[15px] font-medium">{l.title}</span><span className="block text-sm text-muted">{l.text}</span></span>
            <span className="text-faint" aria-hidden>&rarr;</span>
          </a>
        ))}
      </div>
    </div>
  );
}
