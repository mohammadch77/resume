import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { encodeImage } from "@/lib/media/encode";

const HERO = path.resolve(__dirname, "..", "..", "design", "reference", "hero");

/** The alpha channel of a decoded image, sampled at a point given in the source's 899 x 767 coordinates. */
async function alphaAt(buf: Buffer, x: number, y: number): Promise<{ alpha: number; hasAlpha: boolean }> {
  const meta = await sharp(buf).metadata();
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = Math.round((x / 899) * (info.width - 1));
  const py = Math.round((y / 767) * (info.height - 1));
  return { alpha: data[(py * info.width + px) * 4 + 3], hasAlpha: meta.hasAlpha === true };
}

describe("the hero images keep their transparency through the media pipeline", () => {
  for (const name of ["hero-sketch.png", "hero-bold.png"]) {
    it(`${name}: original, every AVIF, WebP and PNG variant has an alpha channel, transparent below the stand, opaque on it`, async () => {
      const src = readFileSync(path.join(HERO, name));
      const enc = await encodeImage(src, "image/png");
      expect(enc.fallbackFormat).toBe("png");
      expect([enc.original.width, enc.original.height]).toEqual([899, 767]);
      const files: Array<[string, Buffer]> = [["original", enc.original.data]];
      for (const v of enc.variants) {
        files.push([`${v.width}.avif`, v.avif], [`${v.width}.webp`, v.webp], [`${v.width}.png`, v.fallback]);
      }
      const sizes: string[] = [];
      for (const [label, buf] of files) {
        const empty = await alphaAt(buf, 100, 720);
        const solid = await alphaAt(buf, 450, 650);
        expect(empty.hasAlpha, `${name} ${label} has alpha`).toBe(true);
        expect(empty.alpha, `${name} ${label} below the stand`).toBeLessThanOrEqual(8);
        expect(solid.alpha, `${name} ${label} on the stand`).toBeGreaterThanOrEqual(247);
        sizes.push(`${label}=${(buf.length / 1024).toFixed(1)}KB`);
      }
      console.log(`${name}: ${sizes.join("  ")}`);
    }, 60_000);
  }

  it("the two images are the same size (the second is revealed through the first)", async () => {
    const [a, b] = await Promise.all(["hero-sketch.png", "hero-bold.png"].map((n) => sharp(readFileSync(path.join(HERO, n))).metadata()));
    expect([a.width, a.height]).toEqual([b.width, b.height]);
  });
});
