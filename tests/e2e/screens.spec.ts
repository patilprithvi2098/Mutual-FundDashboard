import { test } from "@playwright/test";

// Captures full-page screenshots for a visual design review. Run on demand:
//   npx playwright test tests/e2e/screens.spec.ts --project=chrome
// Output: test-results/screens/<page>-<width>.png
// ADAPT: the page list.
const PAGES = [
  { path: "/", name: "report" }, { path: "/history", name: "trends" }, { path: "/goals", name: "goals" },
  { path: "/funds", name: "funds" }, { path: "/components-map", name: "components-map" }, { path: "/example", name: "example" },
];
const WIDTHS = [375, 768, 1440];

for (const p of PAGES) {
  for (const w of WIDTHS) {
    test(`screenshot: ${p.name} at ${w}px`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `test-results/screens/${p.name}-${w}.png`, fullPage: true });
    });
  }
}
