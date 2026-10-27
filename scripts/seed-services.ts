import pg from "pg";
import { z } from "zod";

/**
 * The four real services of the landing (`npm run seed:services`). Unlike `db:seed` this is real, published content with
 * no «نمونه» label, so it is allowed in production, like `seed:owner`. Idempotent: a service whose slug already exists
 * (live) is left exactly as it is, so edits made in the admin panel are never overwritten. Copy is deliberately plain:
 * no numbers, clients or promises that cannot be proven.
 */
export const SERVICE_SEED = [
  { slug: "web-design", title: "طراحی وب‌سایت", iconKey: "globe", summary: "سایت شرکتی و معرفی پروژه‌ها با ساختار روشن، واکنش‌گرا روی همه‌ی اندازه‌ها، و پنل مدیریت محتوا." },
  { slug: "app-design", title: "طراحی اپلیکیشن", iconKey: "smartphone", summary: "اپلیکیشن موبایل و وب‌اپ برای کسب‌وکارتان؛ از تعریف جریان کاربر تا انتشار و به‌روزرسانی." },
  { slug: "ui-ux-design", title: "طراحی UI/UX", iconKey: "palette", summary: "پژوهش، جریان کاربر و رابط کاربری؛ طراحی‌ای که هدف کسب‌وکار و نیاز کاربر را کنار هم می‌گذارد." },
  { slug: "seo-services", title: "خدمات سئو", iconKey: "search", summary: "ساختار فنی درست، محتوای قابل‌فهم برای موتورهای جستجو و گزارش شفاف از وضعیت سایت." },
] as const;

type Queryable = Pick<pg.Pool, "query">;

/** Inserts the missing services as published (a service is created as a draft and then published, as the admin panel does). */
export async function seedServices(db: Queryable): Promise<{ created: string[]; kept: string[] }> {
  const created: string[] = [];
  const kept: string[] = [];
  for (const [index, s] of SERVICE_SEED.entries()) {
    const found = await db.query(`SELECT 1 FROM services WHERE slug = $1 AND deleted_at IS NULL`, [s.slug]);
    if (found.rowCount) {
      kept.push(s.slug);
      continue;
    }
    const { rows } = await db.query<{ id: string }>(`INSERT INTO services (slug, title, summary, icon_key, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [s.slug, s.title, s.summary, s.iconKey, index + 1]);
    await db.query(`UPDATE services SET status = 'published', version = version + 1 WHERE id = $1`, [rows[0].id]);
    created.push(s.slug);
  }
  return { created, kept };
}

async function main() {
  const env = z.object({ MIGRATOR_DATABASE_URL: z.string().min(1) }).parse(process.env);
  const pool = new pg.Pool({ connectionString: env.MIGRATOR_DATABASE_URL, max: 1 });
  try {
    const { created, kept } = await seedServices(pool);
    console.log(`Services: ${created.length} created (${created.join(", ") || "-"}), ${kept.length} already there and left untouched (${kept.join(", ") || "-"}).`);
    // Plain SQL outside a Server Action cannot expire Next's content cache (updateTag only works inside one).
    console.log("NOTE: if the app has run before, delete .next/cache/fetch-cache and .next/server/route-cache (or recreate the container) and restart it; Next keeps its data cache and its rendered pages on disk, so a restart alone serves stale pages.");
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && /seed-services\.ts$/.test(process.argv[1].replaceAll("\\", "/"))) {
  main().catch((err: Error) => {
    console.error(err.message);
    process.exit(1);
  });
}
