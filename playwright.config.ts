import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Runs in the Google Chrome installed on this Mac (channel "chrome"), not Playwright's bundled engines.
  // Each run gets a clean temporary Chrome profile, so tests never touch your real cookies, history or logins.
  projects: [
    { name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "chrome-375", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}/funds`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
