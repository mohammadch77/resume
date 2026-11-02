import { expect, test, type Page } from "@playwright/test";

const CTA = "درخواست مشاوره رایگان";

/** The motion script refuses machines with <= 4 cores or <= 4 GB; the test machine may be one, so say what it is. */
async function machine(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  });
}

test.describe("header and the Tehran clock", () => {
  test("brand, the three section links in page order, the CTA button; the clock chip is filled by script with Persian digits (Shamsi, Asia/Tehran)", async ({ page }) => {
    await machine(page);
    await page.goto("/");
    const header = page.locator("header.lm-header");
    await expect(header.locator(".lm-header__brand")).toContainText("Grin Web");
    expect(await header.locator(".lm-header__nav a").evaluateAll((els) => els.map((e) => e.getAttribute("href")))).toEqual(["#work", "#services", "#clients"]);
    await expect(header.locator(".lm-header__cta")).toHaveText(CTA);
    await expect(header.locator(".lm-clock")).toBeVisible();
    await expect(header.locator(".lm-clock__time")).toHaveText(/^[۰-۹]{2}:[۰-۹]{2}$/, { timeout: 10_000 });
    const date = (await header.locator(".lm-clock__date").textContent()) ?? "";
    expect(date).toMatch(/[۰-۹]{1,2} .+ ۱[۳۴][۰-۹]{2}/);
    // it follows Tehran time, not the machine's: compare with the same formatter computed here
    const now = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tehran" }).format(new Date());
    const shown = (await header.locator(".lm-clock__time").textContent()) ?? "";
    const toMin = (t: string) => {
      const [h, m] = t.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).split(":").map(Number);
      return h * 60 + m;
    };
    expect(Math.abs(toMin(shown) - toMin(now))).toBeLessThanOrEqual(1);
  });

  test("the clock reserves its space: filling it moves nothing", async ({ page }) => {
    await machine(page);
    await page.goto("/", { waitUntil: "networkidle" });
    const box = await page.locator(".lm-clock").boundingBox();
    await expect(page.locator(".lm-clock__time")).toHaveText(/[۰-۹]/);
    const after = await page.locator(".lm-clock").boundingBox();
    expect(Math.abs(after!.width - box!.width)).toBeLessThanOrEqual(1);
  });
});

test.describe("sticky header and the about section", () => {
  test("the header stays at the top while scrolling, with the menu button and the CTA reachable and a paper behind it", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header.lm-header");
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    const box = await header.boundingBox();
    expect(box?.y).toBe(0);
    await expect(page.locator(".lm-menu-button")).toBeInViewport();
    await expect.poll(() => page.evaluate(() => Number(getComputedStyle(document.querySelector("header.lm-header")!, "::before").opacity))).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("about: the owner's lead and rest sit between the hero and the work, server markup", async ({ page }) => {
    await page.goto("/");
    const about = page.locator("#about");
    await expect(about).toBeVisible();
    await expect(about.locator(".lm-about")).toContainText("با تیم‌های جاه‌طلب");
    const order = await page.evaluate(() => ["home", "about", "work"].map((id) => document.getElementById(id)!.getBoundingClientRect().top));
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });
});

test.describe("the full-screen menu (with JavaScript)", () => {
  test("opens from the button, traps focus, locks the page, Escape closes it and focus returns", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const button = page.locator(".lm-menu-button");
    const menu = page.locator("#lm-menu");
    await button.click();
    await expect(menu).toHaveAttribute("data-open", "true");
    await expect(menu).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#lm-menu a.lm-menu__item")).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("hidden");
    for (let i = 0; i < 9; i += 1) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => document.getElementById("lm-menu")!.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("data-open", "false");
    await expect(button).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe("");
  });

  test("a menu item goes to its section and closes the menu; the Close link does not jump to the top", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const menu = page.locator("#lm-menu");
    await page.locator(".lm-menu-button").click();
    await menu.locator("a.lm-menu__item").nth(1).click();
    await expect(menu).toHaveAttribute("data-open", "false");
    await expect(page).toHaveURL(/#services$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    // wait for the smooth scroll (Lenis) to arrive and stop: a scrollTo during its easing would be fought by it
    let last = -1;
    await expect
      .poll(async () => {
        const y = await page.evaluate(() => window.scrollY);
        const still = y === last;
        last = y;
        return still;
      }, { intervals: [150] })
      .toBe(true);
    // the menu must not move the page when it opens and closes, wherever the page is scrolled
    // (clicks are dispatched from the page, not by Playwright, which would itself scroll an element into view and hide what this test is about)
    await page.evaluate(() => window.scrollTo(0, 40));
    expect(await page.evaluate(() => window.scrollY)).toBe(40);
    await page.evaluate(() => document.querySelector<HTMLElement>(".lm-menu-button")!.click());
    await expect(menu).toHaveAttribute("data-open", "true");
    expect(await page.evaluate(() => window.scrollY)).toBe(40);
    await page.evaluate(() => document.querySelector<HTMLElement>(".lm-menu__close")!.click());
    await expect(menu).toHaveAttribute("data-open", "false");
    expect(await page.evaluate(() => window.scrollY)).toBe(40);
  });

  test("its CTA closes it and opens the contact dialog", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator(".lm-menu-button").click();
    await page.locator("#lm-menu .lm-menu__cta").click();
    await expect(page.locator("#lm-menu")).toHaveAttribute("data-open", "false");
    await expect(page.getByRole("dialog", { name: "درباره‌ی پروژه‌تان بگویید" })).toBeVisible();
  });
});

test.describe("hero carousel card and the «trusted by» names", () => {
  test("the first card shows; next, previous and a click on the card cycle through all three and wrap", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const card = page.locator("[data-carousel]");
    await expect(card).toHaveAttribute("data-ready", "", { timeout: 10_000 });
    const active = () => card.locator(".lm-hcard__item[data-active='true'] .lm-hcard__caption").textContent();
    expect(await active()).toBe("طراحی");
    await card.locator("[data-carousel-next]").click();
    expect(await active()).toBe("توسعه");
    await card.locator("[data-carousel-next]").click();
    expect(await active()).toBe("برند");
    await card.locator("[data-carousel-next]").click();
    expect(await active()).toBe("طراحی");
    await card.locator("[data-carousel-prev]").click();
    expect(await active()).toBe("برند");
    await card.locator(".lm-hcard__tile").click();
    expect(await active()).toBe("طراحی");
    // one visible card at a time, the others are hidden from assistive technology, and the dots follow
    await expect(card.locator(".lm-hcard__item[aria-hidden='true']")).toHaveCount(2);
    await expect(card.locator(".lm-hcard__dot[data-active='true']")).toHaveCount(1);
  });

  test("the clients that agreed to be named are listed", async ({ page }) => {
    await page.goto("/");
    const names = await page.locator(".lm-partners__list li").allInnerTexts();
    expect(names.length).toBeGreaterThanOrEqual(2);
    for (const n of names) expect(n).not.toMatch(/^نمونه/);
  });
});

test.describe("the stats panel", () => {
  test("figures count up from 0 when they arrive in view, and end on their real values with the suffix on the far side", async ({ page }) => {
    await machine(page);
    await page.goto("/", { waitUntil: "networkidle" });
    const first = page.locator("#stats [data-count]").first();
    await expect(first).toHaveText("۰"); // still below the fold: waiting
    await first.scrollIntoViewIfNeeded();
    await expect(first).toHaveText("۱۵۰", { timeout: 5000 });
    await expect(page.locator("#stats [data-count]").nth(2)).toHaveText("۱۲");
    expect(await page.locator("#stats .lm-stats__num").first().evaluate((el) => getComputedStyle(el).direction)).toBe("ltr");
  });

  test("with reduced motion the numbers are final at once", async ({ page }) => {
    await machine(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("#stats [data-count]").first()).toHaveText("۱۵۰");
  });

  test("a figure's «نمونه» label can not appear: the database refuses it, the loader also drops it", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).not.toMatch(/lm-stats__label">\s*نمونه/);
  });
});

test.describe("footer", () => {
  test("tagline, the section links, the services, the socials, the legal line with the Shamsi year and the plain consultation link", async ({ page }) => {
    await page.goto("/");
    const foot = page.locator("footer.lm-foot");
    await expect(foot.locator(".lm-foot__tag")).toHaveText("استودیوی مستقل طراحی و توسعه‌ی سایت و نرم‌افزار.");
    await expect(foot.locator("nav a")).toHaveCount(3);
    expect(await foot.locator(".lm-foot__list").count()).toBeGreaterThanOrEqual(3);
    await expect(foot.locator("a[href='https://t.me/example']")).toBeVisible();
    await expect(foot.locator(".lm-foot__legal")).toContainText(/© ۱[۳۴][۰-۹]{2} Grin Web\./);
    await expect(foot.locator("a.lm-foot__link")).toHaveText(CTA);
    await expect(foot.locator(".lm-pill")).toHaveCount(0);
    // the big faint name is decoration only
    await expect(foot.locator(".lm-foot__mark")).toHaveAttribute("aria-hidden", "true");
  });
});

test.describe("the case-study page and the contact page in the new look", () => {
  test("/work/<slug>: header, the h1, the cover, the three columns, the body element the dialog reads, the CTA and the footer", async ({ page }) => {
    await page.goto("/work/home-appliances-store");
    await expect(page.locator("header.lm-header")).toBeVisible();
    await expect(page.locator("h1")).toHaveText("فروشگاه آنلاین لوازم خانگی");
    await expect(page.locator(".lm-work__cover img")).toHaveCount(1);
    await expect(page.locator("#case-body")).toHaveCount(1);
    await expect(page.locator("#case-body .lm-work__col")).toHaveCount(3);
    await expect(page.locator("main a[href='/contact']").first()).toHaveText(CTA);
    await expect(page.locator("footer.lm-foot")).toBeVisible();
  });

  test("/contact: the form, the contact details, no section of the landing", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1, name: "درباره‌ی پروژه‌تان بگویید" })).toBeVisible();
    await expect(page.locator("form.lm-form")).toBeVisible();
    await expect(page.locator(".lm-contact__details")).toContainText("hello@example.com");
  });
});

test.describe("layout at the two reference widths", () => {
  for (const [name, width, height] of [["desktop", 1440, 900], ["phone", 390, 844]] as const) {
    test(`${name}: nothing scrolls sideways, every section is there, the two-column grid only on desktop`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height }, locale: "fa-IR" });
      const page = await ctx.newPage();
      await page.goto("/", { waitUntil: "networkidle" });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      for (const id of ["home", "work", "services", "stats", "clients"]) await expect(page.locator(`#${id}`)).toBeAttached();
      const columns = await page.locator(".lm-work__grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
      expect(columns).toBe(width >= 768 ? 2 : 1);
      await ctx.close();
    });
  }
});
