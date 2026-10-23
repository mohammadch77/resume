import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";

/**
 * `npm run lhci`: Lighthouse CI against a production build. Needs Docker for the test database (same as test:e2e).
 * Starts the app on port 3101, warms the ISR cache (the first request renders the page, which is not what a visitor
 * gets), runs `lhci autorun` with lighthouserc.cjs, and stops the server whatever the result.
 */
const PORT = 3101;
const BASE = `http://localhost:${PORT}`;
const PG = (process.env.TEST_PG_URL ?? "postgres://postgres:postgres@localhost:5434").replace(/^postgres:\/\/[^@]*@/, "");
const sh = (cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env) => spawnSync(cmd, args, { stdio: "inherit", shell: true, env });

async function waitFor(url: string): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${url} did not come up`);
}

async function main() {
  if (sh("docker", ["compose", "-f", "deploy/docker-compose.test.yml", "up", "-d", "--wait"]).status !== 0) throw new Error("test database did not start");
  if (sh("npx", ["tsx", "scripts/e2e-db.ts"]).status !== 0) throw new Error("e2e database setup failed");
  // LHCI_BUILD=1 rebuilds first (otherwise an existing .next is measured as it is); LHCI_RUNS=1 makes a quick pass
  if ((process.env.LHCI_BUILD === "1" || !existsSync(".next/BUILD_ID")) && sh("npm", ["run", "build"]).status !== 0) throw new Error("build failed");

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: `postgres://app_rw:app_rw@${PG}/gw_e2e`,
    SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123",
    SITE_URL: BASE,
    UPLOADS_DIR: ".e2e-uploads",
    CHROME_PATH: chromium.executablePath(),
  };
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], { shell: true, env, stdio: "ignore" });
  let status = 1;
  try {
    await waitFor(`${BASE}/admin/login`);
    for (const path of ["/", "/work/home-appliances-store"]) await waitFor(`${BASE}${path}`); // renders and caches the ISR pages
    status = sh("npx", ["lhci", "autorun", "--config=lighthouserc.cjs"], { ...env, LHCI_BASE_URL: BASE }).status ?? 1;
  } finally {
    // `next start` runs under a shell on Windows: kill the whole tree
    if (process.platform === "win32" && server.pid) spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else server.kill("SIGTERM");
  }
  process.exit(status);
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
