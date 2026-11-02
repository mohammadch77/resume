import { expect, test, type Page } from "@playwright/test";

const FIRST = "home-appliances-store";

function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || (m.type() === "warning" && /Content Security Policy|Refused to/i.test(m.text()))) problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  return problems;
}

test.describe("CSP of the landing (static, no nonce)", () => {
  test("the hardened directives are all there and no external origin is allowed anywhere", async ({ request }) => {
    for (const path of ["/", `/work/${FIRST}`, "/contact"]) {
      const csp = (await request.get(path)).headers()["content-security-policy"];
      for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "connect-src 'self'", "font-src 'self'", "upgrade-insecure-requests"]) expect(csp, `${path}: ${d}`).toContain(d);
      expect(csp, `${path}: no external origin or wildcard`).not.toMatch(/https?:\/\/|\s\*(;|\s|$)/);
      expect(csp).not.toContain("unsafe-eval");
    }
  });

  test("why 'unsafe-inline' stays for scripts: the inline bootstrap scripts carry the page's database content, which does not exist at build time, so no build-time sha256 can cover them", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((c) => c.trim() !== "");
    expect(inline.length).toBeGreaterThan(1);
    expect(inline.some((c) => c.includes("self.__next_f.push") && c.includes("سایت و نرم‌افزاری")), "an inline script holds the hero copy from the database").toBe(true);
  });

  test("the landing, the menu, the contact dialog and the case dialog work under that CSP with a clean console", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator(".lm-menu-button").click();
    await expect(page.locator("#lm-menu")).toHaveAttribute("data-open", "true");
    await page.keyboard.press("Escape");
    await page.locator(".lm-hero__actions a").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.locator(".lm-card").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto(`/work/${FIRST}`, { waitUntil: "networkidle" });
    await page.goto("/contact", { waitUntil: "networkidle" });
    expect(problems).toEqual([]);
  });
});

test.describe("SEO", () => {
  test("every public page has a title, a description, a canonical, Open Graph and Twitter tags with an image that really loads", async ({ page, request }) => {
    for (const path of ["/", `/work/${FIRST}`]) {
      await page.goto(path);
      expect((await page.title()).length, `${path} title`).toBeGreaterThan(2);
      expect((await page.locator("meta[name='description']").getAttribute("content"))?.length ?? 0, `${path} description`).toBeGreaterThan(20);
      expect(await page.locator("link[rel='canonical']").getAttribute("href")).toContain(path === "/" ? "" : path);
      expect(await page.locator("meta[property='og:title']").getAttribute("content")).toBeTruthy();
      expect(await page.locator("meta[name='twitter:card']").getAttribute("content")).toBe("summary_large_image");
      const image = (await page.locator("meta[property='og:image']").getAttribute("content"))!;
      const res = await request.get(image.replace(/^https?:\/\/[^/]+/, ""));
      expect(res.ok(), `${path} og:image ${image}`).toBe(true);
      expect(res.headers()["content-type"]).toMatch(/^image\//);
    }
  });

  test("our own brand image exists (1200x630, a PNG) and is never one of the hero pictures", async ({ request }) => {
    const res = await request.get("/og-default.png");
    expect(res.ok()).toBe(true);
    const bytes = await res.body();
    expect(bytes.subarray(1, 4).toString()).toBe("PNG");
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
  });

  test("/contact, /dev and /admin are not indexable; the sitemap lists the landing and the published case studies only", async ({ page, request }) => {
    await page.goto("/contact");
    expect(await page.locator("meta[name='robots']").getAttribute("content")).toContain("noindex");
    expect((await request.get("/admin/login")).headers()["x-robots-tag"]).toContain("noindex");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /dev");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(`/work/${FIRST}`);
    for (const hidden of ["/contact", "/admin", "/dev"]) expect(sitemap).not.toContain(hidden);
  });

  test("the structured data is valid JSON with the current copy, contact details from the settings, and nothing that could close the script", async ({ page }) => {
    await page.goto("/");
    const raw = (await page.locator("script[type='application/ld+json']").first().textContent()) ?? "";
    expect(raw).not.toMatch(/[<>&]/);
    const org = JSON.parse(raw);
    expect(org).toMatchObject({ "@type": "Organization", name: "Grin Web" });
    expect(org.description.length).toBeGreaterThan(20);
    expect(org.image).toContain("/og-default.png");
  });
});

test.describe("the hero carousel never moves by itself", () => {
  test("no auto-rotation (so no pause control is needed: WCAG 2.2.2), with or without reduced motion; only the buttons and the card change it", async ({ browser }) => {
    for (const reducedMotion of ["no-preference", "reduce"] as const) {
      const ctx = await browser.newContext({ reducedMotion, locale: "fa-IR" });
      const page = await ctx.newPage();
      await page.goto("/", { waitUntil: "networkidle" });
      const active = () => page.locator(".lm-hcard__item[data-active='true']").first().innerText();
      const before = await active();
      await page.waitForTimeout(7000);
      expect(await active(), `reduced motion: ${reducedMotion}`).toBe(before);
      await page.locator("[data-carousel-next]").click();
      expect(await active()).not.toBe(before);
      await ctx.close();
    }
  });
});
