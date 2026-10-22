import type { MediaMime } from "./config";

const ascii = (b: Uint8Array, start: number, end: number): string => String.fromCharCode(...b.subarray(start, end));

const AVIF_BRANDS = new Set(["avif", "avis"]);
const MP4_BRANDS = new Set(["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "M4VH", "dash"]);

/**
 * Detects the real type from magic bytes. The client-sent Content-Type and the file name are never consulted,
 * so a renamed .exe, an SVG or HTML with an image extension all come back `null`.
 */
export function sniffMime(b: Uint8Array): MediaMime | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(b, 1, 4) === "PNG" && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "image/webp";
  if (ascii(b, 4, 8) === "ftyp") {
    const brand = ascii(b, 8, 12);
    if (AVIF_BRANDS.has(brand)) return "image/avif";
    if (MP4_BRANDS.has(brand)) return "video/mp4";
    return null;
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    // EBML container: WebM and Matroska share it; only the "webm" doctype is accepted.
    return ascii(b, 0, Math.min(b.length, 64)).includes("webm") ? "video/webm" : null;
  }
  return null;
}

export const isImageMime = (m: MediaMime | null): m is Extract<MediaMime, `image/${string}`> => m !== null && m.startsWith("image/");
export const isVideoMime = (m: MediaMime | null): m is Extract<MediaMime, `video/${string}`> => m !== null && m.startsWith("video/");
