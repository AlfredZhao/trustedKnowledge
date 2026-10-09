import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["markdown-slides.spec.ts", "markdown-office.spec.ts"],
  workers: 1,
  timeout: 60_000,
  outputDir: "./node_modules/.cache/slides-test-results",
  use: { browserName: "chromium", serviceWorkers: "block", viewport: { width: 1440, height: 900 } },
  // Deliberately no webServer: all browser requests are served by route.fulfill.
});
