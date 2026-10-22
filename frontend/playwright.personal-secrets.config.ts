import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "personal-secret-editor.spec.ts",
  workers: 1,
  timeout: 60_000,
  outputDir: "./node_modules/.cache/personal-secrets-test-results",
  use: { browserName: "chromium", serviceWorkers: "block" },
  // No webServer: serve the isolated editor fixture entirely via route.fulfill.
});
