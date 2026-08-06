import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:43173",
    headless: true
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 43173 --strictPort",
    url: "http://127.0.0.1:43173",
    reuseExistingServer: !process.env.CI
  }
});
