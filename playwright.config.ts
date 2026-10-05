import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: { baseURL: "http://127.0.0.1:3197", trace: "retain-on-failure" },
  projects: [
    { name: "mobile-chromium", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } }
  ],
  webServer: { command: "npm run start -- --hostname 127.0.0.1 --port 3197", url: "http://127.0.0.1:3197", reuseExistingServer: false, timeout: 120000 }
});
