import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `npm run tokens:check`: our own code (app/, components/) must not carry raw colours or pixel values; they come from
 * design tokens (var(--color-…), var(--space-…), Tailwind classes generated from them). Generated token files are the
 * one place raw values live.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN = ["app", "components"];
const EXTENSIONS = /\.(css|ts|tsx|mdx)$/;
const GENERATED = new Set(["app/tokens.css", "app/theme.css"]);
/** shadcn-generated primitives: vendor code, restyled through the token mapping in app/globals.css, not by hand. */
const VENDOR_PREFIXES = ["components/ui/"];

const RULES: Array<{ name: string; pattern: RegExp }> = [
  { name: "raw hex colour", pattern: /#[0-9a-fA-F]{3,8}\b/g },
  { name: "raw rgb()/hsl()/oklch() colour", pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g },
  // Breakpoints inside a media condition or a `sizes` attribute, e.g. "(min-width: 1280px)", are layout queries, not design values.
  { name: "raw px value", pattern: /(?<!(?:min|max)-width:\s*)(?<![\w.-])\d+(?:\.\d+)?px\b/g },
];

export type Violation = { file: string; line: number; rule: string; text: string };

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (EXTENSIONS.test(name)) yield full;
  }
}

/** Strips comments so a documented "16px" in prose does not count; strings and code are kept. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/[^\n]*/g, (m, lead: string) => lead + " ".repeat(m.length - lead.length));
}

export function findViolations(root = ROOT): Violation[] {
  const out: Violation[] = [];
  for (const dir of SCAN) {
    for (const file of walk(path.join(root, dir))) {
      const rel = path.relative(root, file).replaceAll("\\", "/");
      if (GENERATED.has(rel) || VENDOR_PREFIXES.some((p) => rel.startsWith(p))) continue;
      const lines = stripComments(readFileSync(file, "utf8")).split("\n");
      lines.forEach((text, i) => {
        for (const { name, pattern } of RULES) {
          pattern.lastIndex = 0;
          if (pattern.test(text)) out.push({ file: rel, line: i + 1, rule: name, text: text.trim().slice(0, 120) });
        }
      });
    }
  }
  return out;
}

if (process.argv[1] && path.basename(process.argv[1]) === "tokens-check.ts") {
  const violations = findViolations();
  for (const v of violations) console.error(`${v.file}:${v.line}  ${v.rule}  ${v.text}`);
  if (violations.length > 0) {
    console.error(`\n${violations.length} violation(s). Use a design token instead (see design/tokens, app/theme.css).`);
    process.exit(1);
  }
  console.log("tokens:check passed (no raw colours or px values in app/ and components/)");
}
