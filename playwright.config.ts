import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const baseURL = process.env.APP_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL,
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "npm run start",
    url: `${baseURL}/api/v1/health/live`,
    reuseExistingServer: true,
    timeout: 120000,
  },
});
