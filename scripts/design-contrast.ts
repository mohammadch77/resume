import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `npm run design:contrast`: WCAG 2.x contrast of the colour pairs the site really uses, computed from the generated tokens
 * (app/tokens.css) for both themes. Text pairs need 4.5:1 (AA), frames, icon borders and focus rings 3:1 (non-text).
 * A pair that is not listed here is not checked: add new component colours to PAIRS when a component is added.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type Pair = { what: string; fg: string; bg: string; kind: "text" | "ui"; dark?: { fg?: string; bg?: string } };

const PAIRS: Pair[] = [
  { what: "body text on page", fg: "ink", bg: "paper", kind: "text" },
  { what: "body text on card", fg: "ink", bg: "raised", kind: "text" },
  { what: "muted text on page", fg: "ink-muted", bg: "paper", kind: "text" },
  { what: "muted text on card (service text)", fg: "ink-muted", bg: "raised", kind: "text" },
  { what: "muted text on sunken section", fg: "ink-muted", bg: "sunken", kind: "text" },
  { what: "subtle text on page (captions)", fg: "ink-subtle", bg: "paper", kind: "text" },
  { what: "subtle text on sunken section", fg: "ink-subtle", bg: "sunken", kind: "text" },
  { what: "lapis text on page", fg: "lapis-text", bg: "paper", kind: "text" },
  { what: "lapis text on card (service index)", fg: "lapis-text", bg: "raised", kind: "text" },
  { what: "lapis text on sunken section", fg: "lapis-text", bg: "sunken", kind: "text" },
  { what: "saffron text on page", fg: "saffron-text", bg: "paper", kind: "text" },
  { what: "primary button label", fg: "on-lapis", bg: "lapis", kind: "text" },
  { what: "primary button label, hover", fg: "on-lapis", bg: "lapis-deep", kind: "text" },
  { what: "CTA band text (light: on lapis, dark: on lapis-tint)", fg: "on-lapis", bg: "lapis", kind: "text", dark: { fg: "ink", bg: "lapis-tint" } },
  { what: "CTA band button label (light: lapis on white, dark: on-lapis on lapis)", fg: "lapis", bg: "on-lapis", kind: "text", dark: { fg: "on-lapis", bg: "lapis" } },
  { what: "CTA band button label, hover (light: white on lapis, dark: on-lapis on lapis-deep)", fg: "on-lapis", bg: "lapis", kind: "text", dark: { fg: "on-lapis", bg: "lapis-deep" } },
  { what: "footer text (paper on ink)", fg: "paper", bg: "ink", kind: "text" },
  { what: "footer link focus ring (paper on ink; the default ring is as dark as the ground)", fg: "paper", bg: "ink", kind: "ui" },
  { what: "focus ring on page", fg: "focus-ring", bg: "paper", kind: "ui" },
  { what: "focus ring on CTA band (light: white on lapis, dark: the normal ring on lapis-tint)", fg: "on-lapis", bg: "lapis", kind: "ui", dark: { fg: "focus-ring", bg: "lapis-tint" } },
  { what: "service icon tile border on card", fg: "line-strong", bg: "raised", kind: "ui" },
  { what: "CTA band button against the band (light: white on lapis, dark: lapis on lapis-tint)", fg: "on-lapis", bg: "lapis", kind: "ui", dark: { fg: "lapis", bg: "lapis-tint" } },
  { what: "CTA band against the page (light: lapis block, dark: lapis frame)", fg: "lapis", bg: "paper", kind: "ui" },
];

const MIN = { text: 4.5, ui: 3 } as const;

const channel = (hex: string, i: number) => {
  const v = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The `--color-*` hex values of the first block that starts with `selector` and defines --color-paper. */
function colorBlock(css: string, selector: string): Record<string, string> {
  let from = 0;
  for (;;) {
    const at = css.indexOf(selector, from);
    if (at < 0) throw new Error(`no ${selector} colour block in app/tokens.css`);
    const end = css.indexOf("}", at);
    const body = css.slice(at, end);
    if (body.includes("--color-paper")) {
      return Object.fromEntries([...body.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));
    }
    from = end;
  }
}

export type ContrastRow = { theme: "light" | "dark"; what: string; fg: string; bg: string; ratio: number; min: number; ok: boolean };

export function contrastReport(css = readFileSync(path.join(ROOT, "app/tokens.css"), "utf8")): ContrastRow[] {
  const light = colorBlock(css, ":root{");
  const themes = { light, dark: { ...light, ...colorBlock(css, '[data-theme="dark"]{') } } as const;
  const rows: ContrastRow[] = [];
  for (const theme of ["light", "dark"] as const) {
    for (const p of PAIRS) {
      const fg = theme === "dark" && p.dark?.fg ? p.dark.fg : p.fg;
      const bg = theme === "dark" && p.dark?.bg ? p.dark.bg : p.bg;
      const [fgHex, bgHex] = [themes[theme][fg], themes[theme][bg]];
      if (!fgHex || !bgHex) throw new Error(`unknown colour token in "${p.what}": ${fg} / ${bg}`);
      const ratio = contrastRatio(fgHex, bgHex);
      rows.push({ theme, what: p.what, fg: `${fg} ${fgHex}`, bg: `${bg} ${bgHex}`, ratio, min: MIN[p.kind], ok: ratio >= MIN[p.kind] });
    }
  }
  return rows;
}

if (process.argv[1] && path.basename(process.argv[1]) === "design-contrast.ts") {
  const rows = contrastReport();
  for (const r of rows) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.theme.padEnd(5)} ${r.ratio.toFixed(2).padStart(5)} (min ${r.min})  ${r.what}  [${r.fg} on ${r.bg}]`);
  const failed = rows.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} pair(s) below WCAG AA.`);
    process.exit(1);
  }
  console.log(`\ndesign:contrast passed (${rows.length} pairs, both themes)`);
}
