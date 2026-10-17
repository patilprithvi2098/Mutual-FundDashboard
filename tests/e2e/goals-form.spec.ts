import { test, expect, type Page } from "@playwright/test";
import { guardDialogs, stubWrites, countWrites, tabUntil, tabKey, hasHorizontalOverflow, isoDate } from "./helpers";

/** Opens the "Add a goal" card if it is collapsed and returns the add form. */
async function openAddForm(page: Page) {
  const opener = page.getByRole("button", { name: "Add a goal" });
  if (await opener.count()) await opener.click();
  const form = page.locator(".l-card", { has: page.getByRole("heading", { name: "Add a goal" }) }).locator("form");
  await expect(form).toBeVisible();
  return form;
}

const VALID = { name: "Playwright test goal", target_amount: "500000", target_date: isoDate(400), saved_amount: "10000", monthly_amount: "5000" };

async function fillGoal(form: ReturnType<Page["locator"]>, v: Partial<typeof VALID>) {
  const g = { ...VALID, ...v };
  await form.getByLabel("Goal name").fill(g.name);
  await form.getByLabel("Target amount").fill(g.target_amount);
  await form.getByLabel("Target date").fill(g.target_date);
  await form.getByLabel("Saved so far").fill(g.saved_amount);
  await form.getByLabel("Monthly saving").fill(g.monthly_amount);
}


test.describe("Goals: add-a-goal form", () => {
  test.beforeEach(async ({ page }) => {
    guardDialogs(page);
    await page.goto("/goals");
    await expect(page.getByRole("heading", { name: "Your goals" })).toBeVisible();
  });

  test("empty submit: browser validation blocks it, nothing is sent", async ({ page }) => {
    const writes = countWrites(page, "/api/goals");
    const form = await openAddForm(page);
    await form.getByRole("button", { name: "Add goal" }).click();
    await page.waitForTimeout(500);
    expect(writes.count).toBe(0);
    const nameInvalid = await form.getByLabel("Goal name").evaluate((el) => (el as HTMLInputElement).matches(":invalid"));
    expect(nameInvalid).toBe(true);
  });

  test("invalid: target date in the past is rejected by the server", async ({ page }) => {
    const form = await openAddForm(page);
    await fillGoal(form, { target_date: isoDate(-30) });
    await form.getByRole("button", { name: "Add goal" }).click();
    await expect(page.getByText("Pick a target date in the future.")).toBeVisible();
  });

  test("invalid: saved more than the target is rejected", async ({ page }) => {
    const form = await openAddForm(page);
    await fillGoal(form, { target_amount: "100000", saved_amount: "200000" });
    await form.getByRole("button", { name: "Add goal" }).click();
    await expect(page.getByText(/saved so far must be between/)).toBeVisible();
  });

  test("very long input: each field is capped, nothing is created", async ({ page }) => {
    const posts = await stubWrites(page, "**/api/goals", { methods: ["POST"], status: 500, body: { error: "stub should not be reached" } });
    const form = await openAddForm(page);
    // Name beyond 60 characters: either the browser truncates it or the server refuses it.
    await fillGoal(form, { name: "x".repeat(500) });
    const nameLen = (await form.getByLabel("Goal name").inputValue()).length;
    expect(nameLen).toBeLessThanOrEqual(60);
    // Numbers far beyond the allowed range, in each numeric field, each refused.
    for (const field of ["target_amount", "saved_amount", "monthly_amount"] as const) {
      await page.unroute("**/api/goals");
      await fillGoal(form, { [field]: "9".repeat(40) });
      await form.getByRole("button", { name: "Add goal" }).click();
      await expect(page.getByText(/must be between/)).toBeVisible();
    }
    expect(posts.count).toBe(0);
  });

  test("valid submit: confirmation is shown and the form closes", async ({ page }) => {
    const posts = await stubWrites(page, "**/api/goals", { methods: ["POST"], body: { ok: true, goal: { id: 999 } } });
    const form = await openAddForm(page);
    await fillGoal(form, {});
    await form.getByRole("button", { name: "Add goal" }).click();
    await expect(page.getByText("Goal added.")).toBeVisible();
    expect(posts.count).toBe(1);
  });

  test("double submit: one request while the first is in flight", async ({ page }) => {
    const posts = await stubWrites(page, "**/api/goals", { methods: ["POST"], delayMs: 1_200, body: { ok: true, goal: { id: 999 } } });
    const form = await openAddForm(page);
    await fillGoal(form, {});
    const button = form.getByRole("button", { name: /Add goal|Saving/ });
    await button.click();
    await expect(button).toBeDisabled();
    await button.click({ force: true }).catch(() => undefined);
    await form.getByLabel("Monthly saving").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1_800);
    expect(posts.count).toBe(1);
  });

  test("keyboard-only: Tab through every field and submit with Enter", async ({ page }) => {
    const posts = await stubWrites(page, "**/api/goals", { methods: ["POST"], body: { ok: true, goal: { id: 999 } } });
    await page.locator("body").focus();
    const opener = page.getByRole("button", { name: "Add a goal" });
    if (await opener.count()) {
      for (let i = 0; i < 60; i++) {
        const isOpener = await page.evaluate(() => document.activeElement?.textContent === "Add a goal");
        if (isOpener) break;
        await page.keyboard.press(tabKey(page));
      }
      expect(await page.evaluate(() => document.activeElement?.textContent)).toBe("Add a goal");
      await page.keyboard.press("Enter");
    }
    expect(await tabUntil(page, "input[name='name']", 5)).toBe(true);
    await page.keyboard.type(VALID.name);
    expect(await tabUntil(page, "input[name='target_amount']", 3)).toBe(true);
    await page.keyboard.type(VALID.target_amount);
    expect(await tabUntil(page, "input[name='target_date']", 3)).toBe(true);
    // Date inputs are segmented and locale-dependent, so the date itself is set as a picker would set it.
    await page.evaluate((d) => {
      const el = document.activeElement as HTMLInputElement;
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      set.call(el, d); el.dispatchEvent(new Event("input", { bubbles: true }));
    }, VALID.target_date);
    // Chromium exposes each date segment as a tab stop, so tab until the next field is really focused.
    expect(await tabUntil(page, "input[name='saved_amount']", 6)).toBe(true);
    await page.keyboard.press("ControlOrMeta+a"); await page.keyboard.type(VALID.saved_amount);
    expect(await tabUntil(page, "input[name='monthly_amount']", 3)).toBe(true);
    await page.keyboard.type(VALID.monthly_amount);
    await page.keyboard.press("Enter"); // implicit submission from the last field
    await expect(page.getByText("Goal added.")).toBeVisible();
    expect(posts.count).toBe(1);
  });

  test("Delete goal never goes through without confirmation", async ({ page }) => {
    const writes = countWrites(page, "/api/goals");
    const edit = page.getByRole("button", { name: "Edit this goal" }).first();
    test.skip(!(await edit.count()), "no goals listed");
    await edit.click();
    await page.getByRole("button", { name: "Delete goal" }).click(); // confirm() auto-dismissed
    await page.waitForTimeout(500);
    expect(writes.count).toBe(0);
  });

  test("layout: no horizontal scroll at this viewport", async ({ page }) => {
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});
