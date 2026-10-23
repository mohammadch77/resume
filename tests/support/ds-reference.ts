import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { BrowserContext } from "@playwright/test";

/**
 * Lets the design export's own *.card.html pages run offline. Each card loads React 18.3.1, Babel and (through its
 * Icon) Lucide SVGs from unpkg. We serve the same packages from a local cache (fetched once with `npm pack`, kept out of
 * git) and build the SVGs from lucide-react's icon data, so the reference and our components draw identical glyphs and a
 * difference between the two is a difference in markup or CSS.
 */
const ROOT = path.resolve(__dirname, "..", "..");
const CACHE = path.join(ROOT, ".cache", "ds-fixtures");
const DESIGN = path.join(ROOT, "design");

const PACKAGES = [
  { spec: "react@18.3.1", dir: "react", url: "https://unpkg.com/react@18.3.1/umd/react.development.js", file: "umd/react.development.js" },
  { spec: "react-dom@18.3.1", dir: "react-dom", url: "https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js", file: "umd/react-dom.development.js" },
  { spec: "@babel/standalone@7.29.0", dir: "babel", url: "https://unpkg.com/@babel/standalone@7.29.0/babel.min.js", file: "babel.min.js" },
] as const;

/** Downloads and unpacks the three packages once; later runs (and offline runs) reuse the cache. */
export function ensureReferenceFixtures(): void {
  const missing = PACKAGES.filter((p) => !existsSync(path.join(CACHE, p.dir, "package", p.file)));
  if (missing.length === 0) return;
  const tmp = mkdtempSync(path.join(tmpdir(), "gw-ds-"));
  try {
    for (const p of missing) {
      execFileSync("npm", ["pack", p.spec, "--silent", "--pack-destination", tmp], { shell: true, stdio: "pipe" });
      const tarball = path.join(tmp, `${p.spec.replace("@babel/", "babel-").replace("@", "-").replace(/^-/, "")}.tgz`);
      const target = path.join(CACHE, p.dir);
      mkdirSync(target, { recursive: true });
      // bsdtar ships with Windows 10+, macOS and Linux
      execFileSync("tar", ["-xzf", tarball, "-C", target], { stdio: "pipe" });
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** The `<svg>` unpkg would serve for `lucide-static/icons/<name>.svg`, built from lucide-react's icon data. */
async function lucideSvg(name: string): Promise<string | null> {
  const iconsDir = path.join(ROOT, "node_modules", "lucide-react", "dist", "esm", "icons");
  let file = path.join(iconsDir, `${name}.mjs`);
  // Renamed icons (e.g. trash-2) are one-line modules: `export { default } from './trash.mjs'`.
  for (let hop = 0; hop < 3 && existsSync(file); hop += 1) {
    const alias = /export \{ default \} from '\.\/([a-z0-9-]+)\.mjs'/.exec(readFileSync(file, "utf8"));
    if (!alias) break;
    file = path.join(iconsDir, `${alias[1]}.mjs`);
  }
  if (!existsSync(file)) return null;
  const mod = (await import(pathToFileURL(file).href)) as { __iconData: { node: Array<[string, Record<string, string>]> } };
  const children = mod.__iconData.node
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ")}/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`;
}

/** Answers every unpkg request a design card makes from the local cache. */
export async function serveReferenceCdn(context: BrowserContext): Promise<void> {
  await context.route("https://unpkg.com/**", async (route) => {
    const url = route.request().url();
    const pkg = PACKAGES.find((p) => p.url === url);
    if (pkg) {
      await route.fulfill({ status: 200, contentType: "application/javascript", body: readFileSync(path.join(CACHE, pkg.dir, "package", pkg.file)) });
      return;
    }
    const icon = /\/lucide-static@[\d.]+\/icons\/([a-z0-9-]+)\.svg$/.exec(url);
    const svg = icon ? await lucideSvg(icon[1]) : null;
    if (svg) await route.fulfill({ status: 200, contentType: "image/svg+xml", body: svg });
    else await route.fulfill({ status: 404, body: "not in the offline cache" });
  });
}

export type DesignCard = { name: string; file: string; url: string; viewport: { width: number; height: number } };

/** Reads the card's declared viewport from its `@dsCard` header comment. */
export function designCard(name: string, folder = name): DesignCard {
  const file = path.join(DESIGN, "components", folder, `${name}.card.html`);
  const header = readFileSync(file, "utf8").slice(0, 400);
  const m = /viewport="(\d+)x(\d+)"/.exec(header);
  if (!m) throw new Error(`${name}.card.html has no viewport`);
  return { name, file, url: pathToFileURL(file).href, viewport: { width: Number(m[1]), height: Number(m[2]) } };
}
