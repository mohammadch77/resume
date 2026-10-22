import { afterEach, describe, expect, it, vi } from "vitest";

const valid = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://app_rw:x@localhost:5432/db",
  SESSION_SECRET: "x".repeat(32),
  SITE_URL: "http://localhost:3000",
};

async function loadEnv() {
  vi.resetModules();
  return (await import("@/lib/env")).env;
}

describe("env()", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a valid environment", async () => {
    for (const [k, v] of Object.entries(valid)) vi.stubEnv(k, v);
    const env = await loadEnv();
    expect(env().UPLOADS_DIR).toBe("./uploads");
  });

  it("refuses a short SESSION_SECRET", async () => {
    for (const [k, v] of Object.entries(valid)) vi.stubEnv(k, v);
    vi.stubEnv("SESSION_SECRET", "short");
    const env = await loadEnv();
    expect(() => env()).toThrow(/SESSION_SECRET/);
  });

  it("refuses a non-postgres DATABASE_URL", async () => {
    for (const [k, v] of Object.entries(valid)) vi.stubEnv(k, v);
    vi.stubEnv("DATABASE_URL", "mysql://x");
    const env = await loadEnv();
    expect(() => env()).toThrow(/DATABASE_URL/);
  });
});
