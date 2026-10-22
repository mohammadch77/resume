import sharp from "sharp";
import { MAX_INPUT_PIXELS, VARIANT_WIDTHS, type ImageMime } from "./config";

export type EncodedVariant = { width: number; height: number; avif: Buffer; webp: Buffer; fallback: Buffer };

export type EncodedImage = {
  original: { data: Buffer; ext: "jpg" | "png" | "webp" | "avif"; width: number; height: number };
  fallbackFormat: "jpeg" | "png";
  dominantColor: string;
  variants: EncodedVariant[];
};

/**
 * Widths to generate: the standard ladder below the source width, plus the source width itself
 * (capped at the largest step). Never larger than the source, so nothing is upscaled.
 */
export function variantWidths(sourceWidth: number): number[] {
  const max = VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];
  const widths = new Set<number>(VARIANT_WIDTHS.filter((w) => w < sourceWidth));
  widths.add(Math.min(sourceWidth, max));
  return [...widths].sort((a, b) => a - b);
}

const hex = (n: number) => n.toString(16).padStart(2, "0");

/**
 * Decodes, applies EXIF orientation, and re-encodes. Re-encoding through sharp drops EXIF/GPS/ICC and any
 * trailing or embedded payload, which is why uploaded bytes are never served as they came in.
 */
export async function encodeImage(bytes: Buffer, mime: ImageMime): Promise<EncodedImage> {
  const open = () => sharp(bytes, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS }).autoOrient().toColourspace("srgb");

  const meta = await sharp(bytes, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  const hasAlpha = meta.hasAlpha === true;

  let originalPipeline = open();
  let ext: EncodedImage["original"]["ext"];
  switch (mime) {
    case "image/jpeg":
      originalPipeline = originalPipeline.jpeg({ quality: 90, mozjpeg: true });
      ext = "jpg";
      break;
    case "image/png":
      originalPipeline = originalPipeline.png({ compressionLevel: 9 });
      ext = "png";
      break;
    case "image/webp":
      originalPipeline = originalPipeline.webp({ quality: 90 });
      ext = "webp";
      break;
    case "image/avif":
      originalPipeline = originalPipeline.avif({ quality: 60, effort: 4 });
      ext = "avif";
      break;
  }
  const { data, info } = await originalPipeline.toBuffer({ resolveWithObject: true });

  const fallbackFormat = hasAlpha ? "png" : "jpeg";
  const variants: EncodedVariant[] = [];
  for (const width of variantWidths(info.width)) {
    const base = open().resize({ width, withoutEnlargement: true });
    const [avif, webp, fallback] = await Promise.all([
      base.clone().avif({ quality: 50, effort: 4 }).toBuffer({ resolveWithObject: true }),
      base.clone().webp({ quality: 78 }).toBuffer(),
      (hasAlpha ? base.clone().png({ compressionLevel: 9 }) : base.clone().jpeg({ quality: 80, mozjpeg: true, progressive: true })).toBuffer(),
    ]);
    variants.push({ width: avif.info.width, height: avif.info.height, avif: avif.data, webp, fallback });
  }

  const { dominant } = await sharp(data).stats();
  return {
    original: { data, ext, width: info.width, height: info.height },
    fallbackFormat,
    dominantColor: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
    variants,
  };
}
