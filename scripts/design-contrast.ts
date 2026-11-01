import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `npm run design:contrast`: WCAG 2.x contrast of the colour pairs the site really uses, computed from the generated tokens
 * (app/tokens.css). One theme (v2 has no dark mode). Text pairs need 4.5:1 (AA); focus rings, control borders and large or
 * decorative marks 3:1 (non-text). The accent (#ec3f1e) is 3.97:1 on white: it is used only for fills with ink text on them,
 * large display type and rings, never for small text; small accent-coloured text uses accent-ink.
 * A pair that is not listed here is not checked: add new component colours to PAIRS when a component is added.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type Pair = { what: string; fg: string; bg: string; kind: "text" | "ui" | "large" };

const PAIRS: Pair[] = [
  { what: "body text on page", fg: "ink", bg: "paper", kind: "text" },
  { what: "body text on surface", fg: "ink", bg: "surface", kind: "text" },
  { what: "muted text on page", fg: "ink-muted", bg: "paper", kind: "text" },
  { what: "muted text on surface", fg: "ink-muted", bg: "surface", kind: "text" },
  { what: "muted text on surface-2 (chip fill)", fg: "ink-muted", bg: "surface-2", kind: "text" },
  { what: "subtle text on page (captions, indexes)", fg: "ink-subtle", bg: "paper", kind: "text" },
  { what: "subtle text on surface", fg: "ink-subtle", bg: "surface", kind: "text" },
  { what: "accent-coloured small text on page (links)", fg: "accent-ink", bg: "paper", kind: "text" },
  { what: "accent-coloured small text on surface", fg: "accent-ink", bg: "surface", kind: "text" },
  { what: "accent button label (ink on accent)", fg: "on-accent", bg: "accent", kind: "text" },
  { what: "accent button label, hover (ink on the lighter accent)", fg: "on-accent", bg: "accent-hover", kind: "text" },
  { what: "dark pill / ink card text (white on ink)", fg: "on-ink", bg: "ink", kind: "text" },
  { what: "muted text on ink card", fg: "on-ink-muted", bg: "ink", kind: "text" },
  { what: "faint text on ink card (meta rows)", fg: "on-ink-faint", bg: "ink", kind: "text" },
  { what: "ink on surface pill (light variant)", fg: "ink", bg: "surface", kind: "text" },
  { what: "large display type in accent on page (hero mark, 3:1 large text)", fg: "accent", bg: "paper", kind: "large" },
  { what: "large display type in accent on ink", fg: "accent", bg: "ink", kind: "large" },
  { what: "success message text on its tint", fg: "success", bg: "success-tint", kind: "text" },
  { what: "error message text on its tint", fg: "danger", bg: "danger-tint", kind: "text" },
  { what: "focus ring on page", fg: "focus-ring", bg: "paper", kind: "ui" },
  { what: "focus ring on surface", fg: "focus-ring", bg: "surface", kind: "ui" },
  { what: "focus ring on ink panels", fg: "focus-ring", bg: "ink", kind: "ui" },
  { what: "form control border on page", fg: "line-strong", bg: "paper", kind: "ui" },
  { what: "accent fill against the page (button shape)", fg: "accent", bg: "paper", kind: "ui" },
];

const MIN = { text: 4.5, ui: 3, large: 3 } as const;

const channel = (hex: string, i: number) => {
  const v = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The `--color-*` hex values of the first :root block that defines --color-paper. */
function colorBlock(css: string): Record<string, string> {
  let from = 0;
  for (;;) {
    const at = css.indexOf(":root{", from);
    if (at < 0) throw new Error("no :root colour block in app/tokens.css");
    const end = css.indexOf("}", at);
    const body = css.slice(at, end);
    if (body.includes("--color-paper")) {
      return Object.fromEntries([...body.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
    }
    from = end;
  }
}

export type ContrastRow = { what: string; fg: string; bg: string; ratio: number; min: number; ok: boolean };

export function contrastReport(css = readFileSync(path.join(ROOT, "app/tokens.css"), "utf8")): ContrastRow[] {
  const colors = colorBlock(css);
  return PAIRS.map((p) => {
    const [fgHex, bgHex] = [colors[p.fg], colors[p.bg]];
    if (!fgHex || !bgHex) throw new Error(`unknown colour token in "${p.what}": ${p.fg} / ${p.bg}`);
    const ratio = contrastRatio(fgHex, bgHex);
    return { what: p.what, fg: `${p.fg} ${fgHex}`, bg: `${p.bg} ${bgHex}`, ratio, min: MIN[p.kind], ok: ratio >= MIN[p.kind] };
  });
}

if (process.argv[1] && path.basename(process.argv[1]) === "design-contrast.ts") {
  const rows = contrastReport();
  for (const r of rows) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.ratio.toFixed(2).padStart(5)} (min ${r.min})  ${r.what}  [${r.fg} on ${r.bg}]`);
  const failed = rows.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`\n${failed.length} pair(s) below WCAG AA.`);
    process.exit(1);
  }
  console.log(`\ndesign:contrast passed (${rows.length} pairs)`);
}
