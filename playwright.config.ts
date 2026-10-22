import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const PG_HOST = (process.env.TEST_PG_URL ?? "postgres://postgres:postgres@localhost:5434").replace(/^postgres:\/\/[^@]*@/, "");

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, locale: "fa-IR" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/admin/login`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      NODE_ENV: "production",
      DATABASE_URL: `postgres://app_rw:app_rw@${PG_HOST}/gw_e2e`,
      SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123",
      SITE_URL: `http://localhost:${PORT}`,
      LOGIN_RATE_LIMIT_PER_MIN: "1000",
      UPLOADS_DIR: ".e2e-uploads",
    },
  },
});
