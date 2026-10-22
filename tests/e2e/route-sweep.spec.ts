import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const ADMIN_DIR = path.resolve("app/(admin)/admin");

/** Every admin page.tsx on disk, as the URL it serves (route groups removed). */
function adminRoutes(dir = ADMIN_DIR, segments: string[] = []): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      const isGroup = name.startsWith("(") && name.endsWith(")");
      out.push(...adminRoutes(full, isGroup ? segments : [...segments, name]));
    } else if (name === "page.tsx") {
      out.push("/admin" + (segments.length ? "/" + segments.join("/") : ""));
    }
  }
  return out;
}

const routes = adminRoutes();

test("the sweep finds every admin page", () => {
  expect(routes).toEqual(
    expect.arrayContaining([
      "/admin", "/admin/login", "/admin/projects", "/admin/clients", "/admin/services", "/admin/categories", "/admin/testimonials",
      "/admin/media", "/admin/leads", "/admin/settings", "/admin/users", "/admin/audit",
    ]),
  );
});

for (const route of routes) {
  if (route === "/admin/login") {
    test(`${route} is the only public admin page`, async ({ request }) => {
      expect((await request.get(route)).status()).toBe(200);
    });
    continue;
  }
  test(`${route} redirects anonymous visitors to the login page`, async ({ request }) => {
    const res = await request.get(route, { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    expect(res.headers()["location"]).toMatch(/\/admin\/login$/);
  });
  test(`${route} refuses anonymous mutations`, async ({ request, baseURL }) => {
    const res = await request.post(route, { headers: { origin: baseURL! }, data: "x", maxRedirects: 0 });
    expect(res.status()).toBe(401);
  });
  test(`${route} refuses a garbage session cookie`, async ({ request }) => {
    const res = await request.get(route, { headers: { cookie: "__Host-gw_session=not-a-real-token" }, maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    expect(res.headers()["location"]).toMatch(/\/admin\/login$/);
  });
}
