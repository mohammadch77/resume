import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import { IMAGE_MAX_BYTES, MIME_EXT, VIDEO_MAX_BYTES, type ImageMime, type VideoMime } from "./config";
import { encodeImage } from "./encode";
import { newMediaBase } from "./paths";
import { isImageMime, isVideoMime, sniffMime } from "./sniff";
import type { ImageVariants } from "./variants";

export type MediaAssetRow = typeof mediaAssets.$inferSelect;

export type IngestErrorCode = "empty" | "unsupported_type" | "too_large" | "corrupt_image" | "video_needs_poster";

export class IngestError extends Error {
  constructor(public readonly code: IngestErrorCode) {
    super(code);
  }
}

export type IngestContext = { db: Db; uploadsDir: string; userId: string; requestId: string };
export type IngestResult = { asset: MediaAssetRow; deduped: boolean };

const sha256 = (b: Buffer) => createHash("sha256").update(b).digest("hex");

async function findBySha(db: Db, hash: string): Promise<MediaAssetRow | undefined> {
  return (await db.select().from(mediaAssets).where(eq(mediaAssets.sha256, hash)).limit(1))[0];
}

async function writeAll(uploadsDir: string, files: Array<{ rel: string; data: Buffer }>): Promise<string[]> {
  const written: string[] = [];
  try {
    for (const f of files) {
      const full = path.join(uploadsDir, f.rel);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, f.data, { mode: 0o644 });
      written.push(f.rel);
    }
  } catch (err) {
    await removeFiles(uploadsDir, written);
    throw err;
  }
  return written;
}

export async function removeFiles(uploadsDir: string, rels: string[]): Promise<void> {
  await Promise.all(rels.map((rel) => rm(path.join(uploadsDir, rel), { force: true })));
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === "23505" || e.cause?.code === "23505";
}

/** Validates, de-duplicates, re-encodes (EXIF stripped) and stores an image with its AVIF/WebP/fallback ladder. */
export async function ingestImage(ctx: IngestContext, bytes: Buffer): Promise<IngestResult> {
  if (bytes.length === 0) throw new IngestError("empty");
  if (bytes.length > IMAGE_MAX_BYTES) throw new IngestError("too_large");
  const mime = sniffMime(bytes);
  if (!isImageMime(mime)) throw new IngestError("unsupported_type");

  const hash = sha256(bytes);
  const existing = await findBySha(ctx.db, hash);
  if (existing) return { asset: existing, deduped: true };

  let encoded;
  try {
    encoded = await encodeImage(bytes, mime as ImageMime);
  } catch {
    throw new IngestError("corrupt_image");
  }
  if (encoded.original.data.length > IMAGE_MAX_BYTES) throw new IngestError("too_large");

  const base = newMediaBase();
  const fbExt = encoded.fallbackFormat === "png" ? "png" : "jpg";
  const files: Array<{ rel: string; data: Buffer }> = [{ rel: `${base}-original.${encoded.original.ext}`, data: encoded.original.data }];
  const variants: ImageVariants = { fallbackFormat: encoded.fallbackFormat, items: [] };
  for (const v of encoded.variants) {
    const avif = `${base}-${v.width}.avif`;
    const webp = `${base}-${v.width}.webp`;
    const fallback = `${base}-${v.width}.${fbExt}`;
    files.push({ rel: avif, data: v.avif }, { rel: webp, data: v.webp }, { rel: fallback, data: v.fallback });
    variants.items.push({
      width: v.width,
      height: v.height,
      avif: { path: avif, bytes: v.avif.length },
      webp: { path: webp, bytes: v.webp.length },
      fallback: { path: fallback, bytes: v.fallback.length },
    });
  }

  const written = await writeAll(ctx.uploadsDir, files);
  try {
    const asset = await withActor(ctx.db, ctx.userId, ctx.requestId, async (tx) => {
      const [row] = await tx
        .insert(mediaAssets)
        .values({
          kind: "image",
          mime: mime as ImageMime,
          bytes: encoded.original.data.length,
          width: encoded.original.width,
          height: encoded.original.height,
          dominantColor: encoded.dominantColor,
          sha256: hash,
          originalPath: files[0].rel,
          variants,
          uploadedBy: ctx.userId,
        })
        .returning();
      return row;
    });
    return { asset, deduped: false };
  } catch (err) {
    await removeFiles(ctx.uploadsDir, written);
    if (isUniqueViolation(err)) {
      const raced = await findBySha(ctx.db, hash);
      if (raced) return { asset: raced, deduped: true };
    }
    throw err;
  }
}

/** Stores a video as-is (size-capped, magic-byte checked). A poster image is mandatory. */
export async function ingestVideo(ctx: IngestContext, video: Buffer, poster: Buffer | null): Promise<IngestResult> {
  if (video.length === 0) throw new IngestError("empty");
  if (video.length > VIDEO_MAX_BYTES) throw new IngestError("too_large");
  const mime = sniffMime(video);
  if (!isVideoMime(mime)) throw new IngestError("unsupported_type");
  if (!poster || poster.length === 0) throw new IngestError("video_needs_poster");

  const hash = sha256(video);
  const existing = await findBySha(ctx.db, hash);
  if (existing) return { asset: existing, deduped: true };

  const { asset: posterAsset } = await ingestImage(ctx, poster);

  const rel = `${newMediaBase()}-video.${MIME_EXT[mime as VideoMime]}`;
  const written = await writeAll(ctx.uploadsDir, [{ rel, data: video }]);
  try {
    const asset = await withActor(ctx.db, ctx.userId, ctx.requestId, async (tx) => {
      const [row] = await tx
        .insert(mediaAssets)
        .values({
          kind: "video",
          mime: mime as VideoMime,
          bytes: video.length,
          sha256: hash,
          originalPath: rel,
          variants: {},
          posterMediaId: posterAsset.id,
          uploadedBy: ctx.userId,
        })
        .returning();
      return row;
    });
    return { asset, deduped: false };
  } catch (err) {
    await removeFiles(ctx.uploadsDir, written);
    if (isUniqueViolation(err)) {
      const raced = await findBySha(ctx.db, hash);
      if (raced) return { asset: raced, deduped: true };
    }
    throw err;
  }
}
