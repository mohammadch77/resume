/** Must match the CHECK constraints in drizzle/migrations/0001_schema.sql (media_bytes_limit, media_mime_allowlist). */
export const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

/** Largest accepted request body: a video plus its poster plus multipart overhead. */
export const UPLOAD_MAX_REQUEST_BYTES = VIDEO_MAX_BYTES + IMAGE_MAX_BYTES + 1024 * 1024;

export const VARIANT_WIDTHS = [480, 768, 1280, 1920] as const;

/** Decompression-bomb guard: a small file can describe a gigantic bitmap. */
export const MAX_INPUT_PIXELS = 80_000_000;

export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/avif";
export type VideoMime = "video/mp4" | "video/webm";
export type MediaMime = ImageMime | VideoMime;

export const MIME_EXT: Record<MediaMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

/** Served content types by extension; anything else is not served at all. */
export const EXT_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
};
