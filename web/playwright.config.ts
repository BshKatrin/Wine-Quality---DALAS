import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command:
        "npm run dev -- --mode demo --host 127.0.0.1 --port 5180 --strictPort",
      url: "http://127.0.0.1:5180",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run preview -- --host 127.0.0.1 --port 4180 --strictPort",
      url: "http://127.0.0.1:4180",
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: "demo",
      testMatch: "explorer.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:5180",
        viewport: { width: 1440, height: 1000 },
        colorScheme: "light",
      },
    },
    {
      name: "production",
      testMatch: "production.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:4180",
        viewport: { width: 1440, height: 1000 },
        colorScheme: "light",
      },
    },
  ],
});
