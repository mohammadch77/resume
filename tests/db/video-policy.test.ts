import { afterAll, describe, expect, it } from "vitest";
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from "@/lib/media/config";
import { E, CHECK_VIOLATION, connect, mkClient, mkIndustry, mkMedia, mkProject, mkUser, rejected, sha, uid } from "./helpers";

const pools = connect();
afterAll(() => pools.close());

const GW_MEDIA_KIND = "GW006";

async function mkVideo(userId: string, posterId: string): Promise<string> {
  const r = await pools.su.query<{ id: string }>(
    `INSERT INTO media_assets (kind, mime, bytes, sha256, original_path, poster_media_id, uploaded_by)
     VALUES ('video', 'video/mp4', 5000, $1, $2, $3, $4) RETURNING id`,
    [sha(), `v/${uid()}.mp4`, posterId, userId],
  );
  return r.rows[0].id;
}

describe("size limits: the TypeScript constants and the database agree", () => {
  it("media_bytes_limit contains exactly IMAGE_MAX_BYTES and VIDEO_MAX_BYTES", async () => {
    const r = await pools.su.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'media_bytes_limit' AND conrelid = 'media_assets'::regclass`,
    );
    const def = r.rows[0].def;
    expect(def).toContain(`bytes <= ${IMAGE_MAX_BYTES}`);
    expect(def).toContain(`bytes <= ${VIDEO_MAX_BYTES}`);
    expect(VIDEO_MAX_BYTES).toBe(25 * 1024 * 1024);
  });
  it("a video of exactly the limit is accepted, one byte more is refused", async () => {
    const user = await mkUser(pools.su);
    const poster = await mkMedia(pools.su, user);
    const ins = (bytes: number) =>
      pools.app.query(
        `INSERT INTO media_assets (kind, mime, bytes, sha256, original_path, poster_media_id, uploaded_by)
         VALUES ('video', 'video/webm', $1, $2, $3, $4, $5)`,
        [bytes, sha(), `v/${uid()}.webm`, poster, user],
      );
    await ins(VIDEO_MAX_BYTES);
    expect((await rejected(ins(VIDEO_MAX_BYTES + 1))).code).toBe(CHECK_VIOLATION);
  });
  it("images keep their own, smaller cap: exactly 15 MB is fine, above it is refused even though video may be larger", async () => {
    const user = await mkUser(pools.su);
    const ins = (bytes: number) =>
      pools.app.query(
        `INSERT INTO media_assets (kind, mime, bytes, width, height, sha256, original_path, uploaded_by)
         VALUES ('image', 'image/jpeg', $1, 10, 10, $2, $3, $4)`,
        [bytes, sha(), `i/${uid()}.jpg`, user],
      );
    await ins(IMAGE_MAX_BYTES);
    expect(IMAGE_MAX_BYTES).toBeLessThan(VIDEO_MAX_BYTES);
    expect((await rejected(ins(IMAGE_MAX_BYTES + 1))).code).toBe(CHECK_VIOLATION);
  });
});

describe("video is gallery-only", () => {
  it("a video row without a poster is refused", async () => {
    const user = await mkUser(pools.su);
    const err = await rejected(
      pools.app.query(
        `INSERT INTO media_assets (kind, mime, bytes, sha256, original_path, uploaded_by) VALUES ('video', 'video/mp4', 10, $1, $2, $3)`,
        [sha(), `v/${uid()}.mp4`, user],
      ),
    );
    expect(err.code).toBe(CHECK_VIOLATION);
  });

  it("a video cannot be a project cover — on insert or update", async () => {
    const user = await mkUser(pools.su);
    const video = await mkVideo(user, await mkMedia(pools.su, user));
    const industry = await mkIndustry(pools.su);
    const project = await mkProject(pools.su, industry);
    const update = pools.app.query(`UPDATE projects SET cover_media_id = $2, version = version + 1 WHERE id = $1`, [project, video]);
    expect((await rejected(update)).code).toBe(GW_MEDIA_KIND);
    const insert = pools.app.query(
      `INSERT INTO projects (slug, title, industry_id, summary, cover_media_id) VALUES ($1, 't', $2, 'خلاصه‌ی نمونه برای آزمون', $3)`,
      [`p-${uid()}`, industry, video],
    );
    expect((await rejected(insert)).code).toBe(GW_MEDIA_KIND);
  });

  it("an image cover still works", async () => {
    const user = await mkUser(pools.su);
    const image = await mkMedia(pools.su, user);
    const project = await mkProject(pools.su, await mkIndustry(pools.su));
    await pools.app.query(`UPDATE projects SET cover_media_id = $2, version = version + 1 WHERE id = $1`, [project, image]);
  });

  it("a video cannot be a client logo", async () => {
    const user = await mkUser(pools.su);
    const video = await mkVideo(user, await mkMedia(pools.su, user));
    const client = await mkClient(pools.su);
    expect((await rejected(pools.app.query(`UPDATE clients SET logo_media_id = $2 WHERE id = $1`, [client, video]))).code).toBe(GW_MEDIA_KIND);
    await pools.app.query(`UPDATE clients SET logo_media_id = $2 WHERE id = $1`, [client, await mkMedia(pools.su, user)]);
  });

  it("a poster must itself be an image (no video as a poster)", async () => {
    const user = await mkUser(pools.su);
    const video = await mkVideo(user, await mkMedia(pools.su, user));
    const err = await rejected(
      pools.app.query(
        `INSERT INTO media_assets (kind, mime, bytes, sha256, original_path, poster_media_id, uploaded_by)
         VALUES ('video', 'video/mp4', 10, $1, $2, $3, $4)`,
        [sha(), `v/${uid()}.mp4`, video, user],
      ),
    );
    expect(err.code).toBe(GW_MEDIA_KIND);
  });

  it("a video CAN be attached to a project gallery (project_media)", async () => {
    const user = await mkUser(pools.su);
    const video = await mkVideo(user, await mkMedia(pools.su, user));
    const project = await mkProject(pools.su, await mkIndustry(pools.su));
    await pools.app.query(`INSERT INTO project_media (project_id, media_id, position) VALUES ($1, $2, 0)`, [project, video]);
  });

  it("the publish gate still reports a cover problem separately from the kind rule", async () => {
    const project = await mkProject(pools.su, await mkIndustry(pools.su));
    const err = await rejected(pools.app.query(`UPDATE projects SET status = 'published', published_at = now(), version = version + 1 WHERE id = $1`, [project]));
    expect(err.code).toBe(E.gate);
  });
});
