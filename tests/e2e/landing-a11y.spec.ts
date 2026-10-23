import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * axe-core (WCAG 2.0/2.1 A and AA rules, including colour contrast) against the landing, an open case study and the
 * static case-study page, in both themes. Serious and critical violations fail the test; everything axe reports at any
 * impact is printed so that moderate/minor findings can be listed in the phase report.
 */
async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  for (const v of results.violations) console.log(`[axe ${label}] ${v.impact} ${v.id}: ${v.nodes.length} node(s) — ${v.help}`);
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 4).join(" | ")}`), `${label}: serious/critical axe violations`).toEqual([]);
}

const setTheme = (page: Page, theme: "light" | "dark") => page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);

for (const theme of ["light", "dark"] as const) {
  test.describe(`axe, ${theme} theme`, () => {
    test("landing page", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      await setTheme(page, theme);
      await scan(page, `landing ${theme}`);
    });

    test("landing page with the case-study modal open", async ({ page }) => {
      await page.goto("/");
      await setTheme(page, theme);
      await page.locator(".gw-project").first().getByRole("link", { name: /جزئیات/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await scan(page, `modal ${theme}`);
    });

    test("static case-study page", async ({ page }) => {
      await page.goto("/work/home-appliances-store");
      await setTheme(page, theme);
      await scan(page, `work ${theme}`);
    });
  });
}

test("the page has one h1, a skip link, landmarks, and the document language and direction", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("header nav[aria-label='ناوبری اصلی']")).toHaveCount(1);
  await expect(page.locator("footer")).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "رفتن به محتوای اصلی" })).toBeFocused();
});
