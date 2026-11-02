import sharp from "sharp";
import { loadTokens } from "./gen-tokens";

/**
 * `npx tsx scripts/make-og.ts`: writes public/og-default.png (1200x630), the brand image used for link previews when a page has no cover of its own.
 * It is our own mark on the page colours from design/tokens.json, with no text (so no font is needed and nothing unlicensed is used).
 * The mark is the same path as the header's brand mark (components/site/ui, 24x24 viewBox).
 */
const t = loadTokens();
const size = 360;
const scale = size / 24;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${t.color.surface}"/>
<rect x="0" y="582" width="1200" height="48" fill="${t.color.accent}"/>
<g transform="translate(${(1200 - size) / 2} ${(582 - size) / 2}) scale(${scale})" fill="${t.color.accent}"><path d="M2 22V11a10 10 0 0 1 20 0v11h-7V11a3 3 0 0 0-6 0v11z"/></g>
</svg>`;
sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile("public/og-default.png")
  .then(() => console.log("wrote public/og-default.png"));
