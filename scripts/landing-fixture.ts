import { drizzle } from "drizzle-orm/node-postgres";
import { randomUUID } from "node:crypto";
import path from "node:path";
import pg from "pg";
import sharp from "sharp";
import * as schema from "../lib/db/schema";
import type { Db } from "../lib/db/client";
import { ingestImage, ingestVideo } from "../lib/media/ingest";
import { fakeMp4 } from "../tests/support/media-fixtures";

/**
 * Content for the e2e database (and therefore for Lighthouse and the screenshot comparison): the copy of
 * design/ui_kits/landing/data.js turned into real, published rows with real covers, so the landing can be measured
 * against the reference composition. It is TEST data, only ever written to gw_e2e; production content comes from the
 * admin panel. It also plants rows labelled «نمونه», published by direct SQL (which the app's own guard would refuse),
 * so the tests can prove the landing never shows them.
 */

// Token colours (design/tokens/colors.css, light theme), used only to paint the cover images.
const C = { lapis: "#2338d6", lapisDeep: "#16258f", lapisTint: "#e2e6fb", saffron: "#f2b01e", ink: "#151922", paper: "#f2f3f5", firouzeh: "#12a594", raised: "#ffffff", sunken: "#e4e7ec", lineStrong: "#7c8494" };
const W = 1200;
const H = 900;

type Block = { s?: number; e?: number; t?: number; bt?: number; w: number; h: number; c: string; round?: boolean };
const ART: Record<1 | 2 | 3 | 4, { bg: string; blocks: Block[] }> = {
  1: { bg: C.lapisTint, blocks: [{ s: 8, t: 14, w: 54, h: 72, c: C.lapis }, { e: 10, bt: 14, w: 22, h: 30, c: C.saffron }] },
  2: { bg: C.ink, blocks: [{ s: 0, t: 0, w: 38, h: 100, c: C.lapis }, { s: 48, t: 20, w: 30, h: 40, c: C.firouzeh, round: true }] },
  3: { bg: C.raised, blocks: [{ s: 10, t: 16, w: 80, h: 10, c: C.ink }, { s: 10, t: 33, w: 52, h: 5, c: C.lineStrong }, { s: 10, t: 48, w: 38, h: 36, c: C.lapis }, { s: 52, t: 48, w: 38, h: 36, c: C.sunken }] },
  4: { bg: C.lapis, blocks: [{ s: 14, t: 16, w: 34, h: 68, c: C.lapisDeep }, { s: 52, t: 16, w: 34, h: 34, c: C.lapisTint }, { s: 52, bt: 16, w: 14, h: 26, c: C.firouzeh }] },
};

/** The design's placeholder compositions as a real image (inline-start = right edge, because the site is RTL). */
async function coverPng(art: 1 | 2 | 3 | 4, tweak = 0): Promise<Buffer> {
  const { bg, blocks } = ART[art];
  const rects = blocks
    .map((b) => {
      const w = (b.w / 100) * W;
      const h = (b.h / 100) * H;
      const x = b.s !== undefined ? W - (b.s / 100) * W - w : ((b.e ?? 0) / 100) * W;
      const y = b.t !== undefined ? (b.t / 100) * H : H - ((b.bt ?? 0) / 100) * H - h;
      return b.round ? `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${b.c}"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${b.c}"/>`;
    })
    .join("");
  // `tweak` makes each file unique (the media table de-duplicates by content hash)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${bg}"/>${rects}<rect x="0" y="0" width="${tweak + 1}" height="1" fill="${bg}"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const logoPng = (n: number) => sharp({ create: { width: 320, height: 160, channels: 3, background: n === 1 ? C.lapis : C.ink } }).png().toBuffer();

const SERVICES = [
  { slug: "web-design", title: "طراحی و توسعه‌ی وب‌سایت", summary: "سایت شرکتی سریع و قابل‌مدیریت، از ساختار محتوا تا انتشار.", icon: "globe" },
  { slug: "online-store", title: "فروشگاه اینترنتی", summary: "مسیر خرید کوتاه، درگاه پرداخت و پنل سفارش‌ها.", icon: "shopping-cart" },
  { slug: "custom-software", title: "نرم‌افزار اختصاصی", summary: "سامانه‌های داخلی، داشبورد و اتوماسیون فرایندها.", icon: "code" },
  { slug: "support", title: "پشتیبانی و نگهداری", summary: "به‌روزرسانی، پایش سرعت و امنیت پس از انتشار.", icon: "life-buoy" },
];

const PROJECTS = [
  { slug: "home-appliances-store", industry: "فروشگاه", art: 2 as const, tags: ["Next.js"], service: 1, title: "فروشگاه آنلاین لوازم خانگی", summary: "بازطراحی مسیر خرید و پنل مدیریت سفارش‌ها برای یک فروشگاه چندشعبه.", challenge: "مشتریان در مرحله‌ی پرداخت سبد خرید را رها می‌کردند و ثبت سفارش در انبار دستی بود.", solution: "مسیر خرید را به سه مرحله کوتاه کردیم و پنل سفارش‌ها را مستقیم به انبار متصل کردیم.", outcome: "ثبت سفارش در انبار خودکار شد." },
  { slug: "project-dashboard", industry: "نرم‌افزار", art: 3 as const, tags: ["Laravel"], service: 2, title: "داشبورد مدیریت پروژه", summary: "ابزار داخلی برای پیگیری کارها، جلسه‌ها و صورت‌حساب‌ها.", challenge: "اطلاعات پروژه‌ها میان چند فایل و گروه پیام‌رسان پراکنده بود.", solution: "یک داشبورد واحد با نقش‌های دسترسی و گزارش هفتگی خودکار ساختیم.", outcome: "گزارش هفتگی بدون کار دستی تهیه می‌شود." },
  { slug: "engineering-company-site", industry: "وب‌سایت", art: 4 as const, tags: ["Tailwind"], service: 0, title: "وب‌سایت شرکت مهندسی", summary: "معرفی خدمات و پروژه‌ها با مدیریت محتوای ساده برای تیم فروش.", challenge: "سایت قبلی کند بود و تیم فروش نمی‌توانست محتوا را به‌روز کند.", solution: "سایتی سبک با پنل محتوای فارسی و صفحه‌های پروژه‌ی قابل‌فیلتر ساختیم.", outcome: "تیم فروش خودش محتوا را به‌روز می‌کند." },
  { slug: "clinic-booking", industry: "نرم‌افزار", art: 2 as const, tags: ["React"], service: 2, title: "سامانه‌ی نوبت‌دهی کلینیک", summary: "رزرو آنلاین نوبت، یادآوری پیامکی و تقویم پزشکان.", challenge: "نوبت‌ها تلفنی ثبت می‌شد و تداخل زمانی زیاد بود.", solution: "تقویم مشترک پزشکان با رزرو آنلاین و یادآوری پیامکی پیاده کردیم.", outcome: "نوبت‌ها آنلاین رزرو می‌شود." },
];

export async function seedLandingFixture(migratorUrl: string, uploadsDir: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: migratorUrl, max: 2 });
  const db = drizzle(pool, { schema }) as Db;
  const q = async <T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params: unknown[] = []) => (await pool.query<T>(sql, params)).rows;
  try {
    const [{ id: userId }] = await q<{ id: string }>(`SELECT id FROM users WHERE email = 'owner@e2e.test'`);
    const ctx = { db, uploadsDir: path.resolve(uploadsDir), userId, requestId: randomUUID() };
    const image = async (png: Buffer, alt: string): Promise<string> => {
      const { asset } = await ingestImage(ctx, png);
      await q(`UPDATE media_assets SET alt_fa = $2 WHERE id = $1`, [asset.id, alt]);
      return asset.id;
    };

    await q(
      `UPDATE site_settings SET brand_name = 'Grin Web', hero_title = $1, hero_subtitle = $2, primary_cta_label = 'درخواست مشاوره رایگان',
         contact_phone = '02100000000', contact_email = 'hello@example.com', contact_address = 'تهران، خیابان آزمایش، پلاک ۱',
         socials = '{"telegram":"https://t.me/example","instagram":"https://instagram.com/example"}'::jsonb, version = version + 1 WHERE id = 1`,
      ["سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد", "برای شرکت‌ها و فروشگاه‌ها وب‌سایت و نرم‌افزار اختصاصی می‌سازیم؛ سریع، قابل‌مدیریت و با زمان‌بندی روشن."],
    );

    const industryId: Record<string, string> = {};
    for (const [i, name] of ["وب‌سایت", "فروشگاه", "نرم‌افزار"].entries()) {
      industryId[name] = (await q<{ id: string }>(`INSERT INTO industries (slug, name) VALUES ($1, $2) RETURNING id`, [`fx-ind-${i}`, name]))[0].id;
    }
    const tagId: Record<string, string> = {};
    for (const [i, name] of ["Next.js", "Laravel", "React", "Tailwind"].entries()) {
      tagId[name] = (await q<{ id: string }>(`INSERT INTO tech_tags (slug, name) VALUES ($1, $2) RETURNING id`, [`fx-tag-${i}`, name]))[0].id;
    }

    const publishService = async (slug: string, title: string, summary: string, icon: string, order: number) => {
      const [{ id }] = await q<{ id: string }>(`INSERT INTO services (slug, title, summary, icon_key, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [slug, title, summary, icon, order]);
      await q(`UPDATE services SET status = 'published', version = version + 1 WHERE id = $1`, [id]);
      return id;
    };
    const serviceIds: string[] = [];
    for (const [i, s] of SERVICES.entries()) serviceIds.push(await publishService(`fx-${s.slug}`, s.title, s.summary, s.icon, i));

    const publishProject = async (p: (typeof PROJECTS)[number] & { sort: number; featured: boolean }, coverId: string) => {
      const [{ id }] = await q<{ id: string }>(
        `INSERT INTO projects (slug, title, industry_id, summary, challenge, solution, outcome, cover_media_id, sort_order, is_featured, live_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'https://example.com') RETURNING id`,
        [p.slug, p.title, industryId[p.industry], p.summary, p.challenge, p.solution, p.outcome, coverId, p.sort, p.featured],
      );
      await q(`INSERT INTO project_services (project_id, service_id) VALUES ($1, $2)`, [id, serviceIds[p.service]]);
      for (const t of p.tags) await q(`INSERT INTO project_tech (project_id, tech_tag_id) VALUES ($1, $2)`, [id, tagId[t]]);
      await q(`UPDATE projects SET status = 'published', published_at = now(), version = version + 1 WHERE id = $1`, [id]);
      return id;
    };

    const projectIds: string[] = [];
    for (const [i, p] of PROJECTS.entries()) {
      const cover = await image(await coverPng(p.art, i), `تصویر صفحه‌ی اصلی ${p.title}`);
      projectIds.push(await publishProject({ ...p, sort: i, featured: i < 2 }, cover));
    }

    // Results (figures are fixture data), a gallery with two images and one video, for the first project.
    for (const [i, [label, value]] of [["کاهش زمان ثبت سفارش", "۴۰٪"], ["پروژه‌ی تحویل‌شده", "۲۴"], ["روز تا نسخه‌ی اول", "۴۵"]].entries()) {
      await q(`INSERT INTO project_metrics (project_id, label, value_text, position) VALUES ($1, $2, $3, $4)`, [projectIds[0], label, value, i]);
    }
    const g1 = await image(await coverPng(3, 11), "صفحه‌ی محصول");
    const g2 = await image(await coverPng(4, 12), "پنل سفارش‌ها");
    const poster = await ingestImage(ctx, await coverPng(1, 13));
    await q(`UPDATE media_assets SET alt_fa = 'پوستر ویدیو' WHERE id = $1`, [poster.asset.id]);
    const video = await ingestVideo(ctx, fakeMp4(), await coverPng(1, 14));
    await q(`UPDATE media_assets SET alt_fa = 'مرور پروژه' WHERE id = $1`, [video.asset.id]);
    for (const [i, mediaId] of [g1, g2, video.asset.id].entries()) {
      await q(`INSERT INTO project_media (project_id, media_id, position, caption) VALUES ($1, $2, $3, $4)`, [projectIds[0], mediaId, i, i === 0 ? "صفحه‌ی محصول" : null]);
    }

    // A client that agreed to be shown, with a logo, and one published testimonial with consent.
    const logoA = await image(await logoPng(1), "لوگوی مشتری آزمایشی ۱");
    const logoB = await image(await logoPng(2), "لوگوی مشتری آزمایشی ۲");
    const [{ id: clientA }] = await q<{ id: string }>(`INSERT INTO clients (name, slug, logo_media_id, show_name_publicly) VALUES ('مشتری آزمایشی یک', 'fx-client-1', $1, true) RETURNING id`, [logoA]);
    await q(`INSERT INTO clients (name, slug, logo_media_id, show_name_publicly) VALUES ('مشتری آزمایشی دو', 'fx-client-2', $1, true)`, [logoB]);
    const [{ id: testimonialId }] = await q<{ id: string }>(
      `INSERT INTO testimonials (client_id, author_name, author_role, quote, consent_confirmed) VALUES ($1, 'سارا محمدی', 'مدیر محصول، شرکت آزمایشی', 'همکاری با این تیم روشن و حرفه‌ای بود و تحویل سر موعد انجام شد.', true) RETURNING id`,
      [clientA],
    );
    await q(`UPDATE testimonials SET status = 'published', version = version + 1 WHERE id = $1`, [testimonialId]);

    // Demo rows published by direct SQL (the admin panel refuses this). The landing must never show them.
    const hiddenCover = await image(await coverPng(1, 99), "تصویر پنهان");
    const [{ id: sampleProject }] = await q<{ id: string }>(
      `INSERT INTO projects (slug, title, industry_id, summary, cover_media_id, sort_order, is_featured) VALUES ('fx-sample-project', 'نمونه · پروژه‌ی پنهان', $1, 'نمونه: این پروژه نباید روی سایت دیده شود.', $2, 0, true) RETURNING id`,
      [industryId["وب‌سایت"], hiddenCover],
    );
    await q(`INSERT INTO project_services (project_id, service_id) VALUES ($1, $2)`, [sampleProject, serviceIds[0]]);
    await q(`UPDATE projects SET status = 'published', published_at = now(), version = version + 1 WHERE id = $1`, [sampleProject]);
    await publishService("fx-sample-service", "نمونه · خدمت پنهان", "نمونه: این خدمت نباید روی سایت دیده شود.", "globe", 99);
    const [{ id: sampleTestimonial }] = await q<{ id: string }>(
      `INSERT INTO testimonials (client_id, author_name, quote, consent_confirmed) VALUES ($1, 'نمونه · مشتری پنهان', 'نمونه: این نظر نباید روی سایت دیده شود.', true) RETURNING id`,
      [clientA],
    );
    await q(`UPDATE testimonials SET status = 'published', version = version + 1 WHERE id = $1`, [sampleTestimonial]);
  } finally {
    await pool.end();
  }
}
