import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  // Keep manually saved screenshots when Playwright clears its per-run output.
  outputDir: './test-results/playwright',
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1280, height: 720 } },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
