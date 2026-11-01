import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "../e2e",
  fullyParallel: false,
  outputDir: "../../test-results",
  use: { baseURL: "http://127.0.0.1:3197", trace: "retain-on-failure" },
  projects: [
    { name: "mobile-chromium", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } }
  ],
  webServer: { cwd: resolve(__dirname, "../.."), command: "npm run start -- --hostname 127.0.0.1 --port 3197", url: "http://127.0.0.1:3197", reuseExistingServer: false, timeout: 120000 }
});
