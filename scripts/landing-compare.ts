import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { chromium, type Locator, type Page } from "@playwright/test";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";
import { ensureReferenceFixtures, serveReferenceCdn } from "../tests/support/ds-reference";

/**
 * `npm run landing:compare [baseUrl]` (the app must be running against the e2e database, e.g. the lhci server on
 * port 3101): screenshots of the design export's reference landing (design/ui_kits/landing/index.html) and of our
 * landing at 1440 and 390 px, section by section, each pair put side by side (reference left, ours right) in
 * .cache/landing-compare/, with the size of both and the share of differing pixels. The reference shows the kit's demo
 * content and ours shows real rows, so a difference is expected wherever content differs; the report lists which.
 */
const BASE = process.argv[2] ?? "http://localhost:3101";
const OUT = path.resolve(".cache/landing-compare");
const DESIGN = path.resolve("design");
const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".jsx": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".json": "application/json", ".svg": "image/svg+xml" };

/** The kit loads its own Landing.jsx through Babel's XHR, which Chrome refuses for file:// pages: serve design/ over HTTP. */
function serveDesign(): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    const file = path.join(DESIGN, decodeURIComponent((req.url ?? "/").split("?")[0]));
    if (!file.startsWith(DESIGN)) return void res.writeHead(403).end();
    try {
      res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${(server.address() as { port: number }).port}/ui_kits/landing/index.html` })));
}

type Section = { name: string; ref: string; ours: string };
const SECTIONS: Section[] = [
  { name: "navbar", ref: ".lk-navwrap", ours: ".lk-navwrap" },
  { name: "hero", ref: "#top", ours: "#top" },
  { name: "work", ref: "#work", ours: "#work" },
  { name: "services", ref: "#services", ours: "#services" },
  { name: "process", ref: "#process", ours: "#process" },
  { name: "results", ref: "main > section:nth-of-type(5)", ours: "#results" },
  { name: "testimonial", ref: "main > section:nth-of-type(6)", ours: "section[aria-label='نظر مشتری']" },
  { name: "clients", ref: "#clients", ours: "#clients" },
  { name: "contact", ref: "#contact", ours: "#contact" },
  { name: "footer", ref: ".lk-foot", ours: ".lk-foot" },
];

async function loadAll(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}

async function shot(locator: Locator): Promise<Buffer | null> {
  if ((await locator.count()) === 0) return null;
  await locator.first().scrollIntoViewIfNeeded();
  return locator.first().screenshot({ animations: "disabled" });
}

/** Reference left, ours right, on a neutral ground, top-aligned. */
async function sideBySide(a: Buffer | null, b: Buffer | null, file: string) {
  const [ma, mb] = await Promise.all([a ? sharp(a).metadata() : null, b ? sharp(b).metadata() : null]);
  const wa = ma?.width ?? 200;
  const wb = mb?.width ?? 200;
  const h = Math.max(ma?.height ?? 40, mb?.height ?? 40);
  const gap = 24;
  const layers = [
    ...(a ? [{ input: a, left: 0, top: 0 }] : []),
    ...(b ? [{ input: b, left: wa + gap, top: 0 }] : []),
  ];
  await sharp({ create: { width: wa + gap + wb, height: h, channels: 3, background: "#888888" } }).composite(layers).png().toFile(file);
}

function diffShare(a: Buffer, b: Buffer): { same: boolean; share: number } {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { same: false, share: NaN };
  const changed = pixelmatch(A.data, B.data, undefined, A.width, A.height, { threshold: 0.1 });
  return { same: true, share: changed / (A.width * A.height) };
}

async function main() {
  ensureReferenceFixtures();
  const kit = await serveDesign();
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const rows: Array<Record<string, string | number>> = [];
  for (const [label, width, height] of [["1440", 1440, 900], ["390", 390, 844]] as const) {
    const context = await browser.newContext({ viewport: { width, height }, locale: "fa-IR", reducedMotion: "reduce", deviceScaleFactor: 1 });
    await serveReferenceCdn(context);
    const ref = await context.newPage();
    await ref.goto(kit.url);
    await ref.waitForFunction(() => (document.querySelector("#root")?.children.length ?? 0) > 0, undefined, { timeout: 60_000 });
    await ref.waitForFunction(() => [...document.querySelectorAll(".gw-icon")].every((i) => i.querySelector("svg")), undefined, { timeout: 60_000 });
    await loadAll(ref);
    const ours = await context.newPage();
    await ours.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await loadAll(ours);

    // whole page
    const fullRef = await ref.screenshot({ fullPage: true, animations: "disabled" });
    const fullOurs = await ours.screenshot({ fullPage: true, animations: "disabled" });
    await sideBySide(fullRef, fullOurs, path.join(OUT, `full-${label}.png`));
    const [mr, mo] = await Promise.all([sharp(fullRef).metadata(), sharp(fullOurs).metadata()]);
    rows.push({ viewport: label, section: "(whole page)", reference: `${mr.width}x${mr.height}`, ours: `${mo.width}x${mo.height}`, differing: "n/a" });

    for (const s of SECTIONS) {
      const a = await shot(ref.locator(s.ref));
      const b = await shot(ours.locator(s.ours));
      await sideBySide(a, b, path.join(OUT, `${s.name}-${label}.png`));
      const sizeOf = async (buf: Buffer | null) => (buf ? `${(await sharp(buf).metadata()).width}x${(await sharp(buf).metadata()).height}` : "absent");
      const d = a && b ? diffShare(a, b) : null;
      rows.push({ viewport: label, section: s.name, reference: await sizeOf(a), ours: await sizeOf(b), differing: d ? (d.same ? `${(d.share * 100).toFixed(1)}%` : "size differs") : "n/a" });
    }
    await context.close();
  }
  await browser.close();
  kit.server.close();
  writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(rows, null, 2));
  console.table(rows);
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
