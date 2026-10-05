import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/auth-e2e',
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:3198', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop-auth-simulation', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3198',
    url: 'http://127.0.0.1:3198',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      HEALTHY_STEPS_AUTH_TEST: '1',
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:3199',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'local-test-key',
    },
  },
});
