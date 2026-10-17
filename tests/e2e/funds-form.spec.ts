import { test, expect } from "@playwright/test";
import { guardDialogs, stubWrites, countWrites, tabUntil, tabKey, hasHorizontalOverflow } from "./helpers";

const FUND_OK = { ok: true, fund: { name: "Test Fund Direct Growth (stub)" } };

test.describe("Manage funds: add-a-fund form", () => {
  test.beforeEach(async ({ page }) => {
    guardDialogs(page);
    await page.goto("/funds");
    await expect(page.getByRole("heading", { name: "Manage funds" })).toBeVisible();
  });

  test("empty submit: button is disabled and Enter sends nothing", async ({ page }) => {
    const writes = countWrites(page, "/api/funds");
    const input = page.getByLabel("Add a fund by scheme code");
    const button = page.getByRole("button", { name: "Add fund" });
    await expect(input).toHaveValue("");
    await expect(button).toBeDisabled();
    await input.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    expect(writes.count).toBe(0);
    await expect(page.locator("form p.text-bad, form p.text-good")).toHaveCount(0);
  });

  test("invalid code (letters): server rejects, error shown, nothing added", async ({ page }) => {
    const input = page.getByLabel("Add a fund by scheme code");
    await input.fill("abc");
    await page.getByRole("button", { name: "Add fund" }).click();
    const err = page.locator("form p.text-bad");
    await expect(err).toBeVisible();
    await expect(err).toContainText("numeric scheme code");
    await expect(input).toHaveValue("abc"); // input is kept so the user can correct it
  });

  test("invalid code (negative / zero / decimal): each rejected", async ({ page }) => {
    const input = page.getByLabel("Add a fund by scheme code");
    for (const bad of ["-5", "0", "12.5"]) {
      await input.fill(bad);
      await page.getByRole("button", { name: "Add fund" }).click();
      await expect(page.locator("form p.text-bad")).toBeVisible();
      await expect(page.locator("form p.text-good")).toHaveCount(0);
    }
  });

  test("very long input: 300 digits is refused by validation, not by a lookup", async ({ page, request }) => {
    // API level: validation must answer before any network or database work.
    const started = Date.now();
    const res = await request.post("/api/funds", { data: { code: "9".repeat(300) } });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toContain("scheme code");
    expect(Date.now() - started).toBeLessThan(3_000);
    // UI level: the user sees the validation message, not a raw upstream error.
    const input = page.getByLabel("Add a fund by scheme code");
    await input.fill("9".repeat(300));
    await page.getByRole("button", { name: "Add fund" }).click();
    const err = page.locator("form p.text-bad");
    await expect(err).toBeVisible();
    await expect(err).toContainText("scheme code");
  });

  test("valid submit: success message, input cleared, button re-enabled", async ({ page }) => {
    const posts = await stubWrites(page, "**/api/funds", { body: FUND_OK, methods: ["POST"] });
    const input = page.getByLabel("Add a fund by scheme code");
    await input.fill("120716");
    await page.getByRole("button", { name: "Add fund" }).click();
    const ok = page.locator("form p.text-good");
    await expect(ok).toBeVisible();
    await expect(ok).toContainText("Added Test Fund Direct Growth (stub)");
    await expect(input).toHaveValue("");
    await expect(page.getByRole("button", { name: "Add fund" })).toBeDisabled(); // empty again
    expect(posts.count).toBe(1);
  });

  test("double submit: a second click or Enter while busy sends exactly one request", async ({ page }) => {
    const posts = await stubWrites(page, "**/api/funds", { body: FUND_OK, methods: ["POST"], delayMs: 1_200 });
    const input = page.getByLabel("Add a fund by scheme code");
    const button = page.getByRole("button", { name: /Add fund|Checking/ });
    await input.fill("120716");
    await button.click();
    await expect(button).toBeDisabled();
    await expect(button).toHaveText("Checking…");
    await button.click({ force: true }).catch(() => undefined);
    await input.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("form p.text-good")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(300);
    expect(posts.count).toBe(1);
  });

  test("keyboard-only: Tab to the field, type, Tab to the button, Enter submits", async ({ page }) => {
    const posts = await stubWrites(page, "**/api/funds", { body: FUND_OK, methods: ["POST"] });
    await page.locator("body").focus();
    expect(await tabUntil(page, "input#code")).toBe(true);
    await page.keyboard.type("120716");
    await page.keyboard.press(tabKey(page));
    const onButton = await page.evaluate(() => document.activeElement?.tagName === "BUTTON" && document.activeElement.textContent === "Add fund");
    expect(onButton).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.locator("form p.text-good")).toBeVisible();
    expect(posts.count).toBe(1);
  });

  test("keyboard-only: Enter inside the field submits too", async ({ page }) => {
    const posts = await stubWrites(page, "**/api/funds", { body: FUND_OK, methods: ["POST"] });
    const input = page.getByLabel("Add a fund by scheme code");
    await input.focus();
    await page.keyboard.type("120716");
    await page.keyboard.press("Enter");
    await expect(page.locator("form p.text-good")).toBeVisible();
    expect(posts.count).toBe(1);
  });

  test("Remove never goes through without confirmation", async ({ page }) => {
    const writes = countWrites(page, "/api/funds");
    const remove = page.getByRole("button", { name: "Remove" }).first();
    test.skip(!(await remove.count()), "no funds listed");
    await remove.click(); // confirm() is auto-dismissed by guardDialogs
    await page.waitForTimeout(500);
    expect(writes.count).toBe(0);
  });

  test("layout: no horizontal scroll at this viewport", async ({ page }) => {
    expect(await hasHorizontalOverflow(page)).toBe(false);
    await expect(page.getByRole("button", { name: "Add fund" })).toBeInViewport();
  });
});
