import { expect, test, type Page } from "@playwright/test";

function watchViolations(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text());
  });
  page.on("pageerror", (e) => problems.push(e.message));
  return problems;
}

test("/admin/login: nonce CSP, inline scripts carry that nonce, nothing blocked", async ({ page, request }) => {
  const problems = watchViolations(page);
  const res = await page.goto("/admin/login");
  const csp = res!.headers()["content-security-policy"];
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).not.toContain("unsafe-inline");
  expect(csp).not.toContain("unsafe-eval");

  const nonce = /'nonce-([^']+)'/.exec(csp)![1];
  // Browsers hide the nonce attribute from the DOM, so read it from a raw response. Nonces differ per request,
  // therefore compare the header and the markup of the same response.
  const raw = await request.get("/admin/login");
  const rawNonce = /'nonce-([^']+)'/.exec(raw.headers()["content-security-policy"])![1];
  const html = await raw.text();
  expect(html).toContain(`nonce="${rawNonce}"`);
  expect(rawNonce).not.toBe(nonce);

  // React attaches __reactFiber$ keys to DOM nodes only after hydration: proves our JS ran under the CSP.
  await expect
    .poll(() => page.evaluate(() => Object.keys(document.querySelector("form")!).some((k) => k.startsWith("__reactFiber"))))
    .toBe(true);
  expect(problems).toEqual([]);
});

test("each admin request gets a fresh nonce", async ({ request }) => {
  const a = (await request.get("/admin/login")).headers()["content-security-policy"];
  const b = (await request.get("/admin/login")).headers()["content-security-policy"];
  expect(a).not.toBe(b);
});

test("landing: static CSP header (no nonce), nothing blocked", async ({ page }) => {
  const problems = watchViolations(page);
  const res = await page.goto("/");
  const csp = res!.headers()["content-security-policy"];
  expect(csp).toContain("script-src");
  expect(csp).not.toContain("nonce-");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(problems).toEqual([]);
});
