import { expect, test } from "@playwright/test";

const CTA = "درخواست مشاوره رایگان";
const FIRST = { slug: "home-appliances-store", title: "فروشگاه آنلاین لوازم خانگی" };
const card = (page: import("@playwright/test").Page, title: string) => page.locator(".gw-project").filter({ hasText: title });

test.describe("landing content", () => {
  test("sections come in the order of the brief; the primary CTA label is a button three times", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد");
    const order = await page.locator("main > section").evaluateAll((els) => els.map((e) => e.id || e.getAttribute("aria-label")));
    expect(order).toEqual(["top", "work", "services", "results", "نظر مشتری", "clients"]);
    // navbar, hero and the services band are buttons with this label; the footer one is a plain link (tests/e2e/landing-sections.spec.ts)
    const primary = page.locator(".gw-btn").filter({ hasText: new RegExp(`^${CTA}$`) }).filter({ visible: true });
    await expect(primary).toHaveCount(3);
  });

  test("demo content published by direct SQL is never shown (page, work route, sitemap, structured data)", async ({ request }) => {
    const html = await (await request.get("/")).text();
    for (const hidden of ["پروژه‌ی پنهان", "خدمت پنهان", "مشتری پنهان", "fx-sample-project"]) expect(html, hidden).not.toContain(hidden);
    expect(html).not.toMatch(/نمونه\s*[·:]/);
    expect((await request.get("/work/fx-sample-project")).status()).toBe(404);
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain("fx-sample-project");
    // the real rows are there
    expect(html).toContain(FIRST.title);
    expect(html).toContain("همکاری با این تیم روشن و حرفه‌ای بود");
  });

  test("covers are real images through ResponsivePicture; the design system's CoverArt is not drawn", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator(".gw-project");
    await expect(cards).toHaveCount(4);
    await expect(page.locator(".gw-project picture source[type='image/avif']")).toHaveCount(4);
    await expect(page.locator(".gw-project picture source[type='image/webp']")).toHaveCount(4);
    await expect(page.locator(".gw-project .gw-cover__art")).toHaveCount(0);
    const img = page.locator(".gw-project img").first();
    expect(Number(await img.getAttribute("width"))).toBeGreaterThan(0);
    expect(Number(await img.getAttribute("height"))).toBeGreaterThan(0);
    expect(await img.getAttribute("loading")).toBe("lazy");
    await expect(page.locator("#top img[fetchpriority='high']")).toHaveCount(1); // the one hero image that may be the LCP
  });

  test("every image on the page actually loads (a stale content cache once served 404 cover paths)", async ({ page }) => {
    const failed: string[] = [];
    page.on("response", (r) => r.url().includes("/uploads/") && r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
    await page.goto("/");
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
    });
    await page.waitForLoadState("networkidle");
    const broken = await page.$$eval("img", (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src));
    expect(failed).toEqual([]);
    expect(broken).toEqual([]);
    expect(await page.locator("main img").count()).toBeGreaterThanOrEqual(8); // 2 hero + 4 cards + 2 client logos
  });

  test("the hero and the cards never render a <video>; a video exists only inside the case-study gallery, behind a poster", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("video")).toHaveCount(0);
    await expect(page.locator("#top video, .lk-art video, .gw-project video")).toHaveCount(0);

    await card(page, FIRST.title).getByRole("link", { name: /جزئیات/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const video = dialog.locator("video");
    await expect(video).toHaveCount(1);
    expect(await video.getAttribute("preload")).toBe("none");
    expect(await video.getAttribute("poster")).toContain("/uploads/");
    expect(await video.getAttribute("autoplay")).toBeNull();
    await expect(page.locator("video")).toHaveCount(1);
  });

  test("results, testimonial and clients are shown because real data exists", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#results .gw-metric")).toHaveCount(3);
    await expect(page.locator("#results")).toContainText("۴۰٪");
    await expect(page.locator("blockquote")).toContainText("تحویل سر موعد");
    await expect(page.locator("#clients picture")).toHaveCount(2);
  });

  test("structured data, canonical, Open Graph, robots and sitemap", async ({ page, request }) => {
    await page.goto("/");
    const rawOrg = (await page.locator("script[type='application/ld+json']").first().textContent()) ?? "{}";
    expect(rawOrg, "no raw <, > or & inside the JSON-LD block").not.toMatch(/[<>&]/);
    const org = JSON.parse(rawOrg);
    expect(org).toMatchObject({ "@type": "Organization", name: "Grin Web", telephone: "02100000000", email: "hello@example.com" });
    expect(org.sameAs).toContain("https://t.me/example");
    expect(await page.locator("link[rel='canonical']").getAttribute("href")).toMatch(/^https?:\/\/[^/]+\/?$/); // Next prints the root without a slash
    expect(await page.locator("meta[property='og:image']").getAttribute("content")).toContain("/uploads/");

    await page.goto(`/work/${FIRST.slug}`);
    const work = JSON.parse((await page.locator("script[type='application/ld+json']").first().textContent()) ?? "{}");
    expect(work).toMatchObject({ "@type": "CreativeWork", name: FIRST.title, inLanguage: "fa" });
    expect(await page.locator("link[rel='canonical']").getAttribute("href")).toContain(`/work/${FIRST.slug}`);
    await expect(page.locator("h1")).toHaveText(FIRST.title);
    await expect(page.locator("video")).toHaveCount(1); // the gallery of this case study

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /dev");
    expect(robots).toContain("Sitemap:");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(`/work/${FIRST.slug}`);
  });
});

test.describe("Selected Work: filter, progress, modal", () => {
  test("filter chips narrow the strip and the «۱ از N» line follows", async ({ page }) => {
    await page.goto("/");
    const progress = page.locator(".lk-progress");
    await expect(progress).toContainText("۱ از ۴");
    await page.getByRole("button", { name: "نرم‌افزار", exact: true }).click();
    await expect(page.locator(".gw-project")).toHaveCount(2);
    await expect(progress).toContainText("۱ از ۲");
    await page.getByRole("button", { name: "همه", exact: true }).click();
    await expect(page.locator(".gw-project")).toHaveCount(4);
  });

  test("scrolling the strip moves the progress line (it counts from the start edge, which is the right in RTL)", async ({ page }) => {
    await page.goto("/");
    const strip = page.locator("#work-strip");
    await expect(strip).toBeVisible();
    await strip.evaluate((el) => {
      el.scrollLeft = -el.scrollWidth; // RTL: the end of the strip is negative
    });
    await expect(page.locator(".lk-progress")).toContainText(/[۲۳۴] از ۴/);
    expect(await page.locator(".lk-progress__bar").evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(0);
  });

  test("a card opens the case study with a deep link; Tab stays inside; Escape closes and returns focus; Back closes", async ({ page }) => {
    await page.goto("/");
    const opener = card(page, FIRST.title).getByRole("link", { name: /جزئیات/ });
    await opener.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`#work/${FIRST.slug}$`));
    await expect(dialog.getByRole("heading", { level: 2, name: FIRST.title })).toBeVisible();
    for (const word of ["چالش", "راه‌حل", "نتیجه", "تصویرها", "مشاهده‌ی پروژه‌ی زنده"]) await expect(dialog).toContainText(word);

    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.querySelector("[role=dialog]")?.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/#work$/);
    await expect(opener).toBeFocused();

    await opener.click();
    await expect(dialog).toBeVisible();
    await page.goBack();
    await expect(dialog).toBeHidden();
  });

  test("opening #work/<slug> directly shows that case study, and its CTA closes it and opens the contact dialog", async ({ page }) => {
    await page.goto("/#work/clinic-booking");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { level: 2, name: "سامانه‌ی نوبت‌دهی کلینیک" })).toBeVisible();
    await dialog.getByRole("link", { name: CTA }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("dialog", { name: "درباره‌ی پروژه‌تان بگویید" })).toBeVisible();
    await expect(page).not.toHaveURL(/\/contact/);
  });
});
