import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: "list",
  use: {
    baseURL: process.env.MERIDIAN_TEST_URL ?? "http://127.0.0.1:4273",
    channel: "msedge",
    viewport: { width: 1440, height: 1000 },
    screenshot: "off",
    trace: "off",
  },
});
