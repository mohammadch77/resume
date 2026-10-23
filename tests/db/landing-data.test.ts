import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { loadLandingData } from "@/lib/content/landing";
import type { Db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { connect, mkClient, mkMedia, mkUser, uid } from "./helpers";

const pools = connect();
const db = drizzle(pools.app, { schema }) as Db;
afterAll(() => pools.close());
const RUN = uid();

async function publishedProject(title: string, summary = "خلاصه‌ی یک پروژه با طول کافی برای انتشار", over: { industryName?: string; clientShown?: boolean; slug?: string } = {}) {
  const userId = await mkUser(pools.su, "editor");
  const cover = await mkMedia(pools.su, userId, { alt: "کاور" });
  const industry = (await pools.su.query<{ id: string }>(`INSERT INTO industries (slug, name) VALUES ($1, $2) RETURNING id`, [`i-${uid()}`, over.industryName ?? `حوزه ${RUN}`])).rows[0].id;
  const service = (await pools.su.query<{ id: string }>(`INSERT INTO services (slug, title, summary, icon_key) VALUES ($1, 'خدمت واقعی', 'توضیح خدمت', 'globe') RETURNING id`, [`s-${uid()}`])).rows[0].id;
  await pools.su.query(`UPDATE services SET status = 'published', version = version + 1 WHERE id = $1`, [service]);
  const slug = over.slug ?? `lp-${RUN}-${uid()}`;
  const id = (await pools.su.query<{ id: string }>(`INSERT INTO projects (slug, title, industry_id, summary, cover_media_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [slug, title, industry, summary, cover])).rows[0].id;
  await pools.su.query(`INSERT INTO project_services (project_id, service_id) VALUES ($1, $2)`, [id, service]);
  // direct SQL on purpose: the admin app refuses to publish «نمونه» text, the database does not know the label
  await pools.su.query(`UPDATE projects SET status = 'published', published_at = now(), version = version + 1 WHERE id = $1`, [id]);
  return { id, slug, industry, cover };
}

const slugs = async () => (await loadLandingData(db)).projects.map((p) => p.slug);

describe("landing data: demo content never reaches a visitor", () => {
  it("drops a published project whose title or summary starts with «نمونه», keeps a real one", async () => {
    const real = await publishedProject(`پروژه‌ی واقعی ${RUN}`);
    const sampleTitle = await publishedProject(`نمونه · پروژه ${RUN}`);
    const sampleSummary = await publishedProject(`پروژه‌ی دیگر ${RUN}`, "نمونه: این خلاصه هنوز متن آزمایشی است و باید عوض شود.");
    const list = await slugs();
    expect(list).toContain(real.slug);
    expect(list).not.toContain(sampleTitle.slug);
    expect(list).not.toContain(sampleSummary.slug);
  });

  it("keeps real copy that merely contains the word, e.g. «نمونه‌کار» (the rule is a prefix, not a substring)", async () => {
    const p = await publishedProject(`مجموعه‌ی نمونه‌کار ${RUN}`, "خلاصه‌ای که کلمه‌ی نمونه‌کار را در میانه‌ی جمله دارد و واقعی است.");
    expect(await slugs()).toContain(p.slug);
  });

  it("reads published, non-deleted rows only", async () => {
    const draft = await publishedProject(`پیش‌نویس ${RUN}`);
    await pools.su.query(`UPDATE projects SET status = 'draft', version = version + 1 WHERE id = $1`, [draft.id]);
    const archived = await publishedProject(`بایگانی ${RUN}`);
    await pools.su.query(`UPDATE projects SET status = 'archived', version = version + 1 WHERE id = $1`, [archived.id]);
    const gone = await publishedProject(`حذف‌شده ${RUN}`);
    await pools.su.query(`UPDATE projects SET status = 'draft', version = version + 1 WHERE id = $1`, [gone.id]);
    await pools.su.query(`UPDATE projects SET deleted_at = now(), version = version + 1 WHERE id = $1`, [gone.id]);
    const list = await slugs();
    for (const p of [draft, archived, gone]) expect(list).not.toContain(p.slug);
  });

  it("drops a demo-labelled tag or industry name from the cards but keeps the (real) project", async () => {
    const p = await publishedProject(`پروژه با حوزه‌ی نمونه ${RUN}`, undefined, { industryName: "نمونه · خرده‌فروشی" });
    const project = (await loadLandingData(db)).projects.find((x) => x.slug === p.slug);
    expect(project).toBeDefined();
    expect(project!.industry).toBeNull();
    expect(project!.tags).toEqual([]);
  });

  it("names a client only when they agreed to be shown", async () => {
    const hidden = await publishedProject(`با مشتری پنهان ${RUN}`);
    const shown = await publishedProject(`با مشتری آشکار ${RUN}`);
    const hiddenClient = await mkClient(pools.su);
    const shownClient = await mkClient(pools.su);
    await pools.su.query(`UPDATE clients SET name = 'مشتری پنهان', show_name_publicly = false WHERE id = $1`, [hiddenClient]);
    await pools.su.query(`UPDATE clients SET name = 'مشتری آشکار', show_name_publicly = true WHERE id = $1`, [shownClient]);
    await pools.su.query(`UPDATE projects SET client_id = $1, version = version + 1 WHERE id = $2`, [hiddenClient, hidden.id]);
    await pools.su.query(`UPDATE projects SET client_id = $1, version = version + 1 WHERE id = $2`, [shownClient, shown.id]);
    const byId = new Map((await loadLandingData(db)).projects.map((p) => [p.id, p]));
    expect(byId.get(hidden.id)!.clientName).toBeNull();
    expect(byId.get(shown.id)!.clientName).toBe("مشتری آشکار");
  });

  it("returns a video only with its poster, as a gallery item (never as the cover)", async () => {
    const p = await publishedProject(`با گالری ${RUN}`);
    const userId = await mkUser(pools.su, "editor");
    const poster = await mkMedia(pools.su, userId, { alt: "پوستر" });
    await pools.su.query(`UPDATE media_assets SET variants = $2::jsonb, width = 100, height = 100 WHERE id = $1`, [poster, JSON.stringify({ fallbackFormat: "png", items: [{ width: 100, height: 100, avif: { path: "a.avif", bytes: 1 }, webp: { path: "a.webp", bytes: 1 }, fallback: { path: "a.png", bytes: 1 } }] })]);
    const video = (await pools.su.query<{ id: string }>(
      `INSERT INTO media_assets (kind, mime, bytes, alt_fa, sha256, original_path, variants, uploaded_by, poster_media_id) VALUES ('video', 'video/mp4', 1000, 'ویدیو', $1, $2, '{}', $3, $4) RETURNING id`,
      [`${"cd".repeat(30)}${uid()}`.slice(0, 64), `media/v-${uid()}`, userId, poster],
    )).rows[0].id;
    await pools.su.query(`INSERT INTO project_media (project_id, media_id, position) VALUES ($1, $2, 0)`, [p.id, video]);
    const project = (await loadLandingData(db)).projects.find((x) => x.id === p.id)!;
    expect(project.cover?.altFa).toBe("کاور");
    expect(project.gallery).toHaveLength(1);
    expect(project.gallery[0]).toMatchObject({ kind: "video", poster: { altFa: "پوستر" }, video: { mime: "video/mp4" } });
  });

  it("services, testimonials and the hero subtitle follow the same rule", async () => {
    const real = (await pools.su.query<{ id: string }>(`INSERT INTO services (slug, title, summary, icon_key) VALUES ($1, $2, 'توضیح واقعی', 'globe') RETURNING id`, [`s-${uid()}`, `خدمت واقعی ${RUN}`])).rows[0].id;
    const sample = (await pools.su.query<{ id: string }>(`INSERT INTO services (slug, title, summary, icon_key) VALUES ($1, $2, 'نمونه: توضیح آزمایشی', 'globe') RETURNING id`, [`s-${uid()}`, `نمونه · خدمت ${RUN}`])).rows[0].id;
    for (const id of [real, sample]) await pools.su.query(`UPDATE services SET status = 'published', version = version + 1 WHERE id = $1`, [id]);

    const client = await mkClient(pools.su);
    const t = (author: string, quote: string) =>
      pools.su.query<{ id: string }>(`INSERT INTO testimonials (client_id, author_name, quote, consent_confirmed) VALUES ($1, $2, $3, true) RETURNING id`, [client, author, quote]).then((r) => r.rows[0].id);
    const realTestimonial = await t(`گوینده ${RUN}`, "این یک نظر واقعی و دست‌کم ده حرفی است.");
    const sampleTestimonial = await t(`نمونه · گوینده ${RUN}`, "نمونه: این نظر آزمایشی است و باید عوض شود.");
    for (const id of [realTestimonial, sampleTestimonial]) await pools.su.query(`UPDATE testimonials SET status = 'published', version = version + 1 WHERE id = $1`, [id]);

    const data = await loadLandingData(db);
    const titles = data.services.map((s) => s.title);
    expect(titles).toContain(`خدمت واقعی ${RUN}`);
    expect(titles).not.toContain(`نمونه · خدمت ${RUN}`);
    expect(data.testimonial?.authorName.startsWith("نمونه")).toBe(false);

    await pools.su.query(`INSERT INTO site_settings (id, brand_name, hero_title, hero_subtitle, primary_cta_label) VALUES (1, 'Grin Web', 'تیتر', 'x', 'درخواست مشاوره رایگان') ON CONFLICT (id) DO NOTHING`);
    const before = (await pools.su.query<{ hero_subtitle: string }>(`SELECT hero_subtitle FROM site_settings WHERE id = 1`)).rows[0].hero_subtitle;
    await pools.su.query(`UPDATE site_settings SET hero_subtitle = 'نمونه: این متن را عوض کنید', version = version + 1 WHERE id = 1`);
    expect((await loadLandingData(db)).settings?.heroSubtitle).toBeNull();
    await pools.su.query(`UPDATE site_settings SET hero_subtitle = $1, version = version + 1 WHERE id = 1`, [before]);
  });
});
