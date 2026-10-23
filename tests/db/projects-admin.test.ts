import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { guard } from "@/lib/admin/outcome";
import { createProject, deleteProject, getProject, listProjects, moveProject, setProjectStatus, updateProject } from "@/lib/admin/projects";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { withActor } from "@/lib/db/with-actor";
import type { ProjectFormValues } from "@/lib/validation/project";
import { connect, mkIndustry, mkMedia, mkService, mkUser, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
afterAll(() => pools.close());

const SUMMARY = "خلاصه‌ی یک پروژه با طول کافی برای انتشار";

async function fixture() {
  const userId = await mkUser(pools.su, "editor");
  const industryId = await mkIndustry(pools.su);
  const cover = await mkMedia(pools.su, userId, { alt: "کاور" });
  const second = await mkMedia(pools.su, userId, { alt: "دوم" });
  const service = await mkService(pools.su);
  const values = (over: Partial<ProjectFormValues> = {}): ProjectFormValues => ({
    title: "پروژه", slug: `p-${uid()}`, clientId: "", industryId, summary: SUMMARY, challenge: "", solution: "", outcome: "",
    completedOn: "", liveUrl: "", coverMediaId: cover, isFeatured: false, seoTitle: "", seoDescription: "",
    serviceIds: [service], techTagIds: [], gallery: [], metrics: [], ...over,
  });
  const run = <T>(fn: Parameters<typeof withActor<T>>[3]) => withActor(db, userId, null, fn);
  return { values, run, cover, second, service, userId, industryId };
}

describe("projects admin", () => {
  it("round-trips every field, including relations, gallery order, metrics and the Shamsi date", async () => {
    const f = await fixture();
    const id = await f.run((tx) =>
      createProject(tx, f.values({
        completedOn: "1404/05/12", liveUrl: "https://example.com", isFeatured: true, seoTitle: "سئو",
        gallery: [{ mediaId: f.second, caption: "اول" }, { mediaId: f.cover, caption: "" }],
        metrics: [{ label: "سرعت", value: "۱٫۲ ثانیه" }, { label: "رتبه", value: "۱" }],
      })),
    );
    const got = await getProject(db, id);
    expect(got).toMatchObject({ status: "draft", version: 1 });
    expect(got!.values).toMatchObject({
      completedOn: "1404/05/12", liveUrl: "https://example.com", isFeatured: true, seoTitle: "سئو", serviceIds: [f.service],
      gallery: [{ mediaId: f.second, caption: "اول" }, { mediaId: f.cover, caption: "" }],
      metrics: [{ label: "سرعت", value: "۱٫۲ ثانیه" }, { label: "رتبه", value: "۱" }],
    });
  });

  it("replaces gallery and metrics on update (reordering in one transaction) and bumps the version", async () => {
    const f = await fixture();
    const id = await f.run((tx) => createProject(tx, f.values({ gallery: [{ mediaId: f.cover, caption: "" }, { mediaId: f.second, caption: "" }] })));
    await f.run((tx) => updateProject(tx, id, 1, f.values({ gallery: [{ mediaId: f.second, caption: "" }, { mediaId: f.cover, caption: "" }], metrics: [{ label: "الف", value: "۱" }] })));
    const got = await getProject(db, id);
    expect(got!.version).toBe(2);
    expect(got!.values.gallery.map((g) => g.mediaId)).toEqual([f.second, f.cover]);
    expect(got!.values.metrics).toHaveLength(1);
  });

  it("reports a stale version as a conflict and writes nothing", async () => {
    const f = await fixture();
    const id = await f.run((tx) => createProject(tx, f.values({ title: "قدیمی" })));
    await f.run((tx) => updateProject(tx, id, 1, f.values({ title: "نفر اول" })));
    expect(await f.run((tx) => guard(tx, (sp) => updateProject(sp, id, 1, f.values({ title: "نفر دوم" }))))).toEqual({ kind: "conflict" });
    expect((await getProject(db, id))!.values.title).toBe("نفر اول");
  });

  it("blocks publishing with every missing requirement listed, then publishes and stamps published_at once", async () => {
    const f = await fixture();
    const id = await f.run((tx) => createProject(tx, f.values({ coverMediaId: "", serviceIds: [], summary: "کوتاه" })));
    const blocked = await f.run((tx) => guard(tx, (sp) => setProjectStatus(sp, id, 1, "published")));
    expect(blocked.kind).toBe("blocked");
    if (blocked.kind === "blocked") expect(blocked.reasons.length).toBeGreaterThanOrEqual(2);

    await f.run((tx) => updateProject(tx, id, 1, f.values()));
    await f.run((tx) => setProjectStatus(tx, id, 2, "published"));
    const first = (await pools.su.query(`SELECT published_at FROM projects WHERE id = $1`, [id])).rows[0].published_at as Date;
    expect(first).toBeInstanceOf(Date);

    await f.run((tx) => setProjectStatus(tx, id, 3, "draft"));
    await f.run((tx) => setProjectStatus(tx, id, 4, "published"));
    const again = (await pools.su.query(`SELECT published_at FROM projects WHERE id = $1`, [id])).rows[0].published_at as Date;
    expect(again.getTime()).toBe(first.getTime());
  });

  it("keeps a published project's last service and its cover: saving without them is refused", async () => {
    const f = await fixture();
    const id = await f.run((tx) => createProject(tx, f.values()));
    await f.run((tx) => setProjectStatus(tx, id, 1, "published"));
    expect((await f.run((tx) => guard(tx, (sp) => updateProject(sp, id, 2, f.values({ serviceIds: [] }))))).kind).toBe("blocked");
    const noCover = await f.run((tx) => guard(tx, (sp) => updateProject(sp, id, 2, f.values({ coverMediaId: "" }))));
    expect(noCover).toEqual({ kind: "blocked", reasons: ["کاور انتخاب نشده است."] });
    expect((await getProject(db, id))!.values.serviceIds).toEqual([f.service]);
  });

  it("rejects a video as the cover and a duplicate gallery file", async () => {
    const f = await fixture();
    const video = (await pools.su.query<{ id: string }>(
      `INSERT INTO media_assets (kind, mime, bytes, alt_fa, sha256, original_path, variants, uploaded_by, poster_media_id)
       VALUES ('video', 'video/mp4', 1000, 'ویدیو', $1, $2, '{}', $3, $4) RETURNING id`,
      [`${"ab".repeat(30)}${uid()}`.slice(0, 64), `media/v-${uid()}`, f.userId, f.cover],
    )).rows[0].id;
    expect((await f.run((tx) => guard(tx, (sp) => createProject(sp, f.values({ coverMediaId: video }))))).kind).toBe("failed");
    expect(await f.run((tx) => guard(tx, (sp) => createProject(sp, f.values({ gallery: [{ mediaId: f.cover, caption: "" }, { mediaId: f.cover, caption: "" }] }))))).toMatchObject({ kind: "failed", field: "gallery" });
  });

  it("reorders the list and refuses to delete a published project, then deletes a draft", async () => {
    const f = await fixture();
    const a = await f.run((tx) => createProject(tx, f.values({ title: "الف" })));
    const b = await f.run((tx) => createProject(tx, f.values({ title: "ب" })));
    const order = async () => (await listProjects(db)).map((p) => p.id).filter((id) => id === a || id === b);
    expect(await order()).toEqual([a, b]);
    await f.run((tx) => moveProject(tx, b, "up"));
    expect(await order()).toEqual([b, a]);

    const versionOf = async (id: string) => (await getProject(db, id))!.version;
    const beforePublish = await versionOf(a); // the move above renumbered (and so versioned) both rows
    await f.run((tx) => setProjectStatus(tx, a, beforePublish, "published"));
    const va = await versionOf(a);
    expect(await f.run((tx) => deleteProject(tx, a, va))).toEqual({ ok: false, reason: "published" });
    const vb = await versionOf(b);
    expect(await f.run((tx) => deleteProject(tx, b, vb))).toEqual({ ok: true });
    expect(await getProject(db, b)).toBeNull();
  });

  it("refuses to publish sample content even when cover and service are set", async () => {
    const f = await fixture();
    const id = await f.run((tx) => createProject(tx, f.values({ title: "نمونه · پروژه‌ی ۱" })));
    const outcome = await f.run((tx) => guard(tx, (sp) => setProjectStatus(sp, id, 1, "published")));
    expect(outcome).toEqual({ kind: "blocked", reasons: ["این محتوای «نمونه» است؛ ابتدا آن را با محتوای واقعی جایگزین کنید."] });
    expect((await getProject(db, id))!.status).toBe("draft");
  });
});
