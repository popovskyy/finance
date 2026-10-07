import { defineConfig, devices } from "@playwright/test";

const PORT = 3211;
export const E2E_PASSWORD = "e2e-password";
const TEST_DB = process.env.E2E_DATABASE_URL ?? "postgresql://statky:statky@localhost:55432/statky_test";

// Runs against a production build, a throwaway database and live price providers.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "uk-UA",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    { name: "iphone", use: { ...devices["iPhone 15"], browserName: "chromium" }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `node scripts/reset-test-db.mjs && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/unlock`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: TEST_DB, DATABASE_URL_UNPOOLED: TEST_DB, APP_PASSWORD: E2E_PASSWORD },
  },
});
