import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { designCard, ensureReferenceFixtures, serveReferenceCdn } from "../support/ds-reference";

/**
 * Visual regression against the design export: each component page of ours (/dev/design-system/cards/<name>) is
 * screenshotted next to the export's own <name>.card.html at the card's declared viewport and the two are diffed.
 * MAX_DIFF is the share of differing pixels we tolerate (anti-aliasing and sub-pixel text positions, nothing structural).
 */
const MAX_DIFF = Number(process.env.DS_MAX_DIFF ?? "0.005"); // DS_MAX_DIFF=0 makes any difference fail, which keeps the three images
const CARDS = [
  { name: "button" },
  { name: "chip" },
  { name: "field" },
  // Known difference, and it is the export that is wrong: its Icon strips every width/height attribute from the SVG, so icons built
  // from <rect> (layout-grid, calendar, mail) draw nothing there. Ours draws them; the ~0.4% is exactly those three glyphs.
  { name: "icon" },
  { name: "metric" },
  { name: "modal" },
  { name: "navbar" },
  { name: "project-card", folder: "project-card" },
  { name: "testimonial" },
];

test.beforeAll(() => ensureReferenceFixtures());

async function settled(page: Page, reference: boolean) {
  if (reference) {
    await page.waitForFunction(() => (document.querySelector("#root")?.children.length ?? 0) > 0, undefined, { timeout: 30_000 });
    // the export's Icon fetches its SVG after mount
    await page.waitForFunction(() => [...document.querySelectorAll(".gw-icon")].every((i) => i.querySelector("svg")), undefined, { timeout: 30_000 });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

for (const { name, folder } of CARDS) {
  test(`${name} matches the design export`, async ({ browser, baseURL }) => {
    const card = designCard(name, folder ?? name);
    const context = await browser.newContext({ viewport: card.viewport, locale: "fa-IR", deviceScaleFactor: 1, reducedMotion: "reduce" });
    await serveReferenceCdn(context);

    const reference = await context.newPage();
    await reference.goto(card.url);
    await settled(reference, true);
    const expected = await reference.screenshot({ animations: "disabled" });

    const ours = await context.newPage();
    await ours.goto(`${baseURL}/dev/design-system/cards/${name}`);
    await settled(ours, false);
    const actual = await ours.screenshot({ animations: "disabled" });
    await context.close();

    const a = PNG.sync.read(expected);
    const b = PNG.sync.read(actual);
    expect({ width: b.width, height: b.height }).toEqual({ width: a.width, height: a.height });
    const diff = new PNG({ width: a.width, height: a.height });
    const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
    const ratio = changed / (a.width * a.height);
    if (changed > 0) {
      // keep the three images whenever anything differs, so a regression can be looked at (test-results/ is git-ignored)
      mkdirSync("test-results/design-system", { recursive: true });
      writeFileSync(`test-results/design-system/${name}-export.png`, expected);
      writeFileSync(`test-results/design-system/${name}-ours.png`, actual);
      writeFileSync(`test-results/design-system/${name}-diff.png`, PNG.sync.write(diff));
    }
    console.log(`${name}: ${(ratio * 100).toFixed(3)}% of pixels differ`);
    expect(ratio, `${name}: ${changed} pixels differ`).toBeLessThanOrEqual(MAX_DIFF);
  });
}

test("the specimen page renders in both themes with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/dev/design-system");
  await expect(page.locator("#theme-light")).toBeVisible();
  await expect(page.locator("#theme-dark")).toBeVisible();
  // dark really switches the variables
  const paper = (theme: string) => page.locator(`#theme-${theme}`).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await paper("light")).not.toBe(await paper("dark"));
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
  expect(errors).toEqual([]);
});

test("the page has no horizontal overflow at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/design-system");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
