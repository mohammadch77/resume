import sharp, { type Exif } from "sharp";

/** Small deterministic PRNG so fixtures (and their byte sizes) are reproducible. */
function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * A photograph-like bitmap: smooth colour gradients, soft blobs and fine sensor noise. It is synthetic
 * (there is no real photo in the repo), so byte sizes are indicative, not a benchmark.
 */
export async function photoRaw(width: number, height: number, seed = 7): Promise<{ data: Buffer; info: { width: number; height: number; channels: 3 } }> {
  const rand = prng(seed);
  const blobs = Array.from({ length: 24 }, () => ({
    x: rand() * width,
    y: rand() * height,
    r: (0.05 + rand() * 0.2) * Math.min(width, height),
    c: [rand() * 255, rand() * 255, rand() * 255],
  }));
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      let r = 60 + 120 * (x / width);
      let g = 90 + 90 * (y / height);
      let b = 160 - 80 * (x / width) * (y / height);
      for (const blob of blobs) {
        const d = Math.hypot(x - blob.x, y - blob.y) / blob.r;
        if (d < 1) {
          const w = (1 - d) * (1 - d) * 0.6;
          r += (blob.c[0] - r) * w;
          g += (blob.c[1] - g) * w;
          b += (blob.c[2] - b) * w;
        }
      }
      const n = (rand() - 0.5) * 10;
      data[i] = Math.max(0, Math.min(255, r + n));
      data[i + 1] = Math.max(0, Math.min(255, g + n));
      data[i + 2] = Math.max(0, Math.min(255, b + n));
    }
  }
  return { data, info: { width, height, channels: 3 } };
}

type Fmt = "jpeg" | "png" | "webp" | "avif";

export async function makePhoto(
  width: number,
  height: number,
  opts: { format?: Fmt; exif?: Exif; orientation?: number; seed?: number } = {},
): Promise<Buffer> {
  const { data, info } = await photoRaw(width, height, opts.seed);
  let img = sharp(data, { raw: info });
  if (opts.exif) img = img.withExif(opts.exif);
  if (opts.orientation) img = img.withMetadata({ orientation: opts.orientation });
  switch (opts.format ?? "jpeg") {
    case "png":
      return img.png().toBuffer();
    case "webp":
      return img.webp({ quality: 85 }).toBuffer();
    case "avif":
      return img.avif({ quality: 50, effort: 1 }).toBuffer();
    default:
      return img.jpeg({ quality: 88 }).toBuffer();
  }
}

export const solid = (width: number, height: number, rgb: [number, number, number], format: Fmt = "png") =>
  sharp({ create: { width, height, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } })
    [format]()
    .toBuffer();

export const translucentPng = () =>
  sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 10, g: 120, b: 200, alpha: 0.5 } } })
    .png()
    .toBuffer();

/** Minimal containers: enough magic bytes for the sniffer; the video itself is never decoded. */
export const fakeMp4 = (pad = 64) =>
  Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.from([0, 0, 2, 0]), Buffer.from("isomiso2"), Buffer.alloc(pad, 1)]);

export const fakeWebm = (pad = 64) =>
  Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x84]), Buffer.from("webm"), Buffer.alloc(pad, 2)]);

export const fakeMatroska = () =>
  Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x88]), Buffer.from("matroska"), Buffer.alloc(64, 2)]);

export const fakeExe = () => Buffer.concat([Buffer.from("MZ"), Buffer.from([0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0xff, 0xff]), Buffer.alloc(200, 0)]);
export const svg = () => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
export const html = () => Buffer.from("<!doctype html><html><body><script>alert(1)</script></body></html>");
