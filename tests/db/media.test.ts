import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from "@/lib/media/config";
import { IngestError, ingestImage, ingestVideo, type IngestContext, type IngestErrorCode } from "@/lib/media/ingest";
import { deleteMediaRow, listMedia, removeDeletedFiles, usageCount } from "@/lib/media/library";
import { assetFilePaths, parseVariants } from "@/lib/media/variants";
import { fakeExe, fakeMatroska, fakeMp4, fakeWebm, html, makePhoto, solid, svg, translucentPng } from "../support/media-fixtures";
import { connect, mkClient, mkIndustry, mkProject, mkService, mkUser, rejected, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
let uploadsDir: string;
let userId: string;
let ctx: IngestContext;

beforeAll(async () => {
  uploadsDir = await mkdtemp(path.join(tmpdir(), "gw-uploads-"));
  userId = await mkUser(pools.su, "editor");
  ctx = { db, uploadsDir, userId, requestId: randomUUID() };
});
afterAll(async () => {
  await rm(uploadsDir, { recursive: true, force: true });
  await pools.close();
});

const filesOnDisk = async (): Promise<string[]> => {
  const out: string[] = [];
  const walk = async (dir: string) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else out.push(path.relative(uploadsDir, full).replaceAll("\\", "/"));
    }
  };
  if (existsSync(uploadsDir)) await walk(uploadsDir);
  return out.sort();
};
const rowCount = async () => (await pools.su.query(`SELECT count(*)::int AS n FROM media_assets`)).rows[0].n as number;
const errorCode = async (p: Promise<unknown>): Promise<IngestErrorCode> => {
  try {
    await p;
  } catch (e) {
    if (e instanceof IngestError) return e.code;
    throw e;
  }
  throw new Error("expected IngestError");
};

describe("image ingest", () => {
  it("stores a 3000x2000 photo with an AVIF/WebP/JPEG ladder capped at 1920 px, under random names", async () => {
    const bytes = await makePhoto(3000, 2000);
    const { asset, deduped } = await ingestImage(ctx, bytes);
    expect(deduped).toBe(false);
    expect(asset).toMatchObject({ kind: "image", mime: "image/jpeg", width: 3000, height: 2000, altFa: null, uploadedBy: userId });
    expect(asset.dominantColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(asset.sha256).toMatch(/^[0-9a-f]{64}$/);

    const v = parseVariants(asset.variants)!;
    expect(v.items.map((i) => i.width)).toEqual([480, 768, 1280, 1920]);
    expect(v.fallbackFormat).toBe("jpeg");
    for (const item of v.items) {
      for (const [fmt, file] of [["heif", item.avif], ["webp", item.webp], ["jpeg", item.fallback]] as const) {
        const full = path.join(uploadsDir, file.path);
        expect((await stat(full)).size).toBe(file.bytes);
        const meta = await sharp(full).metadata();
        expect(meta.format).toBe(fmt);
        expect(meta.width).toBe(item.width);
        expect(meta.height).toBe(item.height);
        expect(item.width).toBeLessThanOrEqual(1920);
      }
    }
    for (const p of assetFilePaths(asset)) expect(p).toMatch(/^media\/[0-9a-f]{2}\/[0-9a-f]{32}-(original|\d+)\.(jpg|webp|avif)$/);
  });

  it("never upscales: a 300 px image gets one 300 px variant, a 1000 px image tops out at 1000", async () => {
    const small = (await ingestImage(ctx, await makePhoto(300, 200, { seed: 11 }))).asset;
    expect(parseVariants(small.variants)!.items.map((i) => i.width)).toEqual([300]);
    const mid = (await ingestImage(ctx, await makePhoto(1000, 700, { seed: 12 }))).asset;
    expect(parseVariants(mid.variants)!.items.map((i) => i.width)).toEqual([480, 768, 1000]);
  });

  it("strips EXIF/GPS from every stored file (original included) and applies the orientation", async () => {
    const MARK = "SECRET-MARKER-ZZ9";
    const bytes = await makePhoto(600, 400, {
      seed: 21,
      orientation: 6,
      exif: { IFD0: { Copyright: MARK, ImageDescription: "GPSLEAK" }, IFD3: { GPSLatitudeRef: "N", GPSLongitudeRef: "E" } },
    });
    expect(bytes.includes(Buffer.from(MARK))).toBe(true); // sanity: the input really carries it
    expect((await sharp(bytes).metadata()).orientation).toBe(6);

    const { asset } = await ingestImage(ctx, bytes);
    // 600x400 rotated by orientation 6 becomes 400x600.
    expect([asset.width, asset.height]).toEqual([400, 600]);
    for (const rel of assetFilePaths(asset)) {
      const data = await readFile(path.join(uploadsDir, rel));
      expect(data.includes(Buffer.from(MARK)), rel).toBe(false);
      expect(data.includes(Buffer.from("GPSLEAK")), rel).toBe(false);
      const meta = await sharp(data).metadata();
      expect(meta.exif, rel).toBeUndefined();
      expect(meta.orientation === undefined || meta.orientation === 1, rel).toBe(true);
    }
  });

  it("a JPEG polyglot (script appended after the image) does not survive re-encoding", async () => {
    const payload = Buffer.from("<?php system($_GET['c']); ?><script>alert(1)</script>");
    const bytes = Buffer.concat([await makePhoto(200, 200, { seed: 31 }), payload]);
    const { asset } = await ingestImage(ctx, bytes);
    for (const rel of assetFilePaths(asset)) {
      const data = await readFile(path.join(uploadsDir, rel));
      expect(data.includes(Buffer.from("<?php")), rel).toBe(false);
      expect(data.includes(Buffer.from("<script")), rel).toBe(false);
    }
  });

  it("uses a PNG fallback (keeps transparency) for images with alpha", async () => {
    const { asset } = await ingestImage(ctx, await translucentPng());
    const v = parseVariants(asset.variants)!;
    expect(v.fallbackFormat).toBe("png");
    expect(v.items[0].fallback.path).toMatch(/\.png$/);
    expect((await sharp(path.join(uploadsDir, v.items[0].fallback.path)).metadata()).hasAlpha).toBe(true);
  });

  it("computes the dominant colour", async () => {
    const { asset } = await ingestImage(ctx, await solid(200, 200, [220, 20, 20]));
    const hex = asset.dominantColor!;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(190);
    expect(g).toBeLessThan(60);
    expect(b).toBeLessThan(60);
  });

  it("records the upload in the audit trail with the uploader as actor", async () => {
    const { asset } = await ingestImage(ctx, await makePhoto(120, 90, { seed: 41 }));
    const r = await pools.su.query(`SELECT action, actor_id, request_id FROM audit_log WHERE table_name = 'media_assets' AND row_id = $1`, [asset.id]);
    expect(r.rows).toEqual([{ action: "INSERT", actor_id: userId, request_id: ctx.requestId }]);
  });
});

describe("type spoofing and bad input are refused before anything is stored", () => {
  const cases: Array<[string, () => Buffer | Promise<Buffer>, IngestErrorCode]> = [
    ["a Windows executable renamed .jpg", fakeExe, "unsupported_type"],
    ["an SVG with a script renamed .png", svg, "unsupported_type"],
    ["HTML renamed .webp", html, "unsupported_type"],
    ["a text file", () => Buffer.from("just some text, definitely not an image"), "unsupported_type"],
    ["a Matroska video", fakeMatroska, "unsupported_type"],
    ["an empty file", () => Buffer.alloc(0), "empty"],
    ["a JPEG header followed by garbage", () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 0x41)]), "corrupt_image"],
    ["a PNG header followed by garbage", () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(300, 0x41)]), "corrupt_image"],
    ["an image over 15 MB", () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(IMAGE_MAX_BYTES, 0)]), "too_large"],
  ];
  for (const [name, make, code] of cases) {
    it(`${name} -> ${code}, no row and no file`, async () => {
      const filesBefore = await filesOnDisk();
      const rowsBefore = await rowCount();
      expect(await errorCode(ingestImage(ctx, await make()))).toBe(code);
      expect(await rowCount()).toBe(rowsBefore);
      expect(await filesOnDisk()).toEqual(filesBefore);
    });
  }
});

describe("de-duplication", () => {
  it("the same bytes twice reuse the asset: one row, no new files", async () => {
    const bytes = await makePhoto(500, 300, { seed: 51 });
    const first = await ingestImage(ctx, bytes);
    const rows = await rowCount();
    const files = await filesOnDisk();
    const second = await ingestImage(ctx, Buffer.from(bytes));
    expect(first.deduped).toBe(false);
    expect(second.deduped).toBe(true);
    expect(second.asset.id).toBe(first.asset.id);
    expect(await rowCount()).toBe(rows);
    expect(await filesOnDisk()).toEqual(files);
  });

  it("two simultaneous uploads of the same file end with one row and no orphan files", async () => {
    const bytes = await makePhoto(400, 250, { seed: 61 });
    const filesBefore = (await filesOnDisk()).length;
    const rowsBefore = await rowCount();
    const [a, b] = await Promise.all([ingestImage(ctx, bytes), ingestImage(ctx, bytes)]);
    expect(a.asset.id).toBe(b.asset.id);
    expect(await rowCount()).toBe(rowsBefore + 1);
    const added = (await filesOnDisk()).length - filesBefore;
    expect(added).toBe(assetFilePaths(a.asset).length);
  });
});

describe("video ingest", () => {
  it("requires a poster image", async () => {
    const files = await filesOnDisk();
    const rows = await rowCount();
    expect(await errorCode(ingestVideo(ctx, fakeMp4(), null))).toBe("video_needs_poster");
    expect(await errorCode(ingestVideo(ctx, fakeMp4(), Buffer.alloc(0)))).toBe("video_needs_poster");
    expect(await rowCount()).toBe(rows);
    expect(await filesOnDisk()).toEqual(files);
  });

  it("stores an mp4 as-is with its poster as a separate image asset", async () => {
    const video = fakeMp4(5000);
    const { asset } = await ingestVideo(ctx, video, await makePhoto(320, 180, { seed: 71 }));
    expect(asset).toMatchObject({ kind: "video", mime: "video/mp4", width: null, height: null, variants: {} });
    expect(asset.posterMediaId).not.toBeNull();
    expect(asset.originalPath).toMatch(/^media\/[0-9a-f]{2}\/[0-9a-f]{32}-video\.mp4$/);
    expect(await readFile(path.join(uploadsDir, asset.originalPath))).toEqual(video);
    const [poster] = await db.select().from(schema.mediaAssets).where(eq(schema.mediaAssets.id, asset.posterMediaId!));
    expect(poster.kind).toBe("image");
  });

  it("accepts webm, refuses non-video bytes and videos over the video limit", async () => {
    const poster = await makePhoto(160, 90, { seed: 72 });
    expect((await ingestVideo(ctx, fakeWebm(), poster)).asset.mime).toBe("video/webm");
    expect(await errorCode(ingestVideo(ctx, await makePhoto(50, 50), poster))).toBe("unsupported_type");
    expect(await errorCode(ingestVideo(ctx, fakeExe(), poster))).toBe("unsupported_type");
    expect(await errorCode(ingestVideo(ctx, Buffer.concat([fakeMp4(), Buffer.alloc(VIDEO_MAX_BYTES)]), poster))).toBe("too_large");
  });

  it("a bad poster rejects the whole upload and stores nothing", async () => {
    const files = await filesOnDisk();
    const rows = await rowCount();
    expect(await errorCode(ingestVideo(ctx, fakeMp4(777), fakeExe()))).toBe("unsupported_type");
    expect(await rowCount()).toBe(rows);
    expect(await filesOnDisk()).toEqual(files);
  });
});

describe("usage, safe delete and the publish gate", () => {
  const fresh = async (seed: number) => (await ingestImage(ctx, await makePhoto(240, 160, { seed }))).asset;

  it("an unused asset is deleted: row first, then every file", async () => {
    const asset = await fresh(81);
    const paths = assetFilePaths(asset);
    for (const p of paths) expect(existsSync(path.join(uploadsDir, p))).toBe(true);
    const r = await deleteMediaRow(db, asset.id);
    expect(r).toMatchObject({ ok: true });
    if (r.ok) await removeDeletedFiles(uploadsDir, r.removedFiles);
    expect((await pools.su.query(`SELECT 1 FROM media_assets WHERE id = $1`, [asset.id])).rowCount).toBe(0);
    for (const p of paths) expect(existsSync(path.join(uploadsDir, p))).toBe(false);
  });

  it("an asset used as a cover cannot be deleted: row and files stay, and the database says RESTRICT", async () => {
    const asset = await fresh(82);
    const project = await mkProject(pools.su, await mkIndustry(pools.su));
    await pools.su.query(`UPDATE projects SET cover_media_id = $2, version = version + 1 WHERE id = $1`, [project, asset.id]);
    expect(await usageCount(db, asset.id)).toBe(1);
    expect(await deleteMediaRow(db, asset.id)).toEqual({ ok: false, reason: "in_use" });
    expect((await pools.su.query(`SELECT 1 FROM media_assets WHERE id = $1`, [asset.id])).rowCount).toBe(1);
    for (const p of assetFilePaths(asset)) expect(existsSync(path.join(uploadsDir, p))).toBe(true);
    // even if the application-level check were bypassed, the foreign key refuses
    expect((await rejected(pools.app.query(`DELETE FROM media_assets WHERE id = $1`, [asset.id]))).code).toBe("23001");
  });

  it("counts cover + gallery + client logo + video poster references together", async () => {
    const asset = await fresh(83);
    const industry = await mkIndustry(pools.su);
    const p1 = await mkProject(pools.su, industry);
    const p2 = await mkProject(pools.su, industry);
    const client = await mkClient(pools.su);
    await pools.su.query(`UPDATE projects SET cover_media_id = $2, version = version + 1 WHERE id = $1`, [p1, asset.id]);
    await pools.su.query(`INSERT INTO project_media (project_id, media_id, position) VALUES ($1, $2, 0)`, [p2, asset.id]);
    await pools.su.query(`UPDATE clients SET logo_media_id = $2 WHERE id = $1`, [client, asset.id]);
    await ingestVideo(ctx, fakeMp4(900), await makePhoto(240, 160, { seed: 83 })); // same bytes => poster is this asset
    expect(await usageCount(db, asset.id)).toBe(4);
    const listed = (await listMedia(db, 500)).find((a) => a.id === asset.id);
    expect(listed?.usageCount).toBe(4);
  });

  it("a video's poster cannot be deleted while the video exists", async () => {
    const { asset: video } = await ingestVideo(ctx, fakeMp4(1234), await makePhoto(260, 140, { seed: 84 }));
    expect(await deleteMediaRow(db, video.posterMediaId!)).toEqual({ ok: false, reason: "in_use" });
    expect(await deleteMediaRow(db, randomUUID())).toEqual({ ok: false, reason: "not_found" });
  });

  it("alt text gates publishing: a cover without alt blocks the project, adding it unblocks", async () => {
    const asset = await fresh(85);
    const industry = await mkIndustry(pools.su);
    const project = await mkProject(pools.su, industry);
    await pools.su.query(`UPDATE projects SET cover_media_id = $2, published_at = now(), version = version + 1 WHERE id = $1`, [project, asset.id]);
    await pools.su.query(`INSERT INTO project_services VALUES ($1, $2)`, [project, await mkService(pools.su)]);
    const publish = () => pools.app.query(`UPDATE projects SET status = 'published', version = version + 1 WHERE id = $1`, [project]);
    const err = await rejected(publish());
    expect(err.code).toBe("GW003");
    expect(err.message).toContain("cover_alt");
    await db.update(schema.mediaAssets).set({ altFa: "نمای اصلی پروژه" }).where(eq(schema.mediaAssets.id, asset.id));
    await publish();
    // once published the alt text can no longer be removed
    expect((await rejected(pools.app.query(`UPDATE media_assets SET alt_fa = '' WHERE id = $1`, [asset.id]))).code).toBe("GW003");
  });
});

describe("storage is not guessable", () => {
  it("no stored file name contains anything from the upload (names are random hex)", async () => {
    const all = await filesOnDisk();
    expect(all.length).toBeGreaterThan(10);
    for (const f of all) expect(f).toMatch(/^media\/[0-9a-f]{2}\/[0-9a-f]{32}-[a-z0-9]+\.[a-z0-9]+$/);
    expect(uid()).toBeTruthy();
  });
});
