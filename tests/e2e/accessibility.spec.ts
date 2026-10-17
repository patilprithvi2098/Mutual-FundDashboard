import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  { path: "/", name: "Overview" },
  { path: "/report", name: "Report" },
  { path: "/fund", name: "Fund list" },
  { path: "/fund/120716", name: "Fund detail" },
  { path: "/history", name: "Trends" },
  { path: "/goals", name: "Goals" },
  { path: "/funds", name: "Manage funds" },
  { path: "/more", name: "More" },
  { path: "/components-map", name: "Components map" },
  { path: "/example", name: "Example" },
];

for (const p of PAGES) {
  test(`accessibility: ${p.name} page has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(p.path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = results.violations.map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      count: v.nodes.length,
      examples: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n").slice(1).join(" ").trim()}`),
    }));
    if (summary.length) console.log(`\n[${p.name}] ${JSON.stringify(summary, null, 2)}`);
    expect(summary, `${p.name} accessibility violations`).toEqual([]);
  });
}
