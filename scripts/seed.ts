import { drizzle } from "drizzle-orm/node-postgres";
import { eq, isNull, and } from "drizzle-orm";
import pg from "pg";
import { z } from "zod";
import * as s from "../lib/db/schema";

const SAMPLE = "نمونه";

/**
 * Sample content for local development and demos (`npm run db:seed`). It is NOT part of any migration, because
 * migrations also run in production. Everything here is a draft and carries the label «نمونه»; the first owner is
 * created by `npm run seed:owner`, not here.
 */
const envSchema = z.object({
  MIGRATOR_DATABASE_URL: z.string().min(1),
  NODE_ENV: z.string().optional(),
});

async function main() {
  const force = process.argv.includes("--force");
  if (process.env.NODE_ENV === "production" && !force) {
    throw new Error("Refusing to seed with NODE_ENV=production. Pass --force if you really mean it.");
  }
  const env = envSchema.parse(process.env);
  const pool = new pg.Pool({ connectionString: env.MIGRATOR_DATABASE_URL, max: 2 });
  const db = drizzle(pool, { schema: s });

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(s.siteSettings)
        .values({
          id: 1,
          brandName: "Grin Web",
          heroTitle: "سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد",
          heroSubtitle: `${SAMPLE}: برای صاحبان کسب‌وکار که سایت یا نرم‌افزار سفارشی می‌خواهند. این متن را از پنل مدیریت جایگزین کنید.`,
          primaryCtaLabel: "درخواست مشاوره رایگان",
        })
        .onConflictDoNothing();

      const industryRows = [
        { slug: "sample-retail", name: `${SAMPLE} · خرده‌فروشی` },
        { slug: "sample-education", name: `${SAMPLE} · آموزش` },
        { slug: "sample-services", name: `${SAMPLE} · خدمات` },
      ];
      for (const row of industryRows) {
        const found = await tx.select({ id: s.industries.id }).from(s.industries).where(and(eq(s.industries.slug, row.slug), isNull(s.industries.deletedAt)));
        if (found.length === 0) await tx.insert(s.industries).values(row);
      }

      const serviceRows = [
        { slug: "corporate-site", title: `${SAMPLE} · سایت شرکتی`, iconKey: "globe", sortOrder: 1 },
        { slug: "online-store", title: `${SAMPLE} · فروشگاه اینترنتی`, iconKey: "shopping-cart", sortOrder: 2 },
        { slug: "custom-software", title: `${SAMPLE} · نرم‌افزار سفارشی`, iconKey: "code", sortOrder: 3 },
        { slug: "support", title: `${SAMPLE} · پشتیبانی و توسعه`, iconKey: "life-buoy", sortOrder: 4 },
      ];
      for (const row of serviceRows) {
        const found = await tx.select({ id: s.services.id }).from(s.services).where(and(eq(s.services.slug, row.slug), isNull(s.services.deletedAt)));
        if (found.length === 0) await tx.insert(s.services).values({ ...row, summary: `${SAMPLE}: توضیح این خدمت را از پنل مدیریت بنویسید.` });
      }

      const [firstIndustry] = await tx.select({ id: s.industries.id }).from(s.industries).where(eq(s.industries.slug, "sample-retail"));
      for (let i = 1; i <= 4; i++) {
        const slug = `sample-project-${i}`;
        const found = await tx.select({ id: s.projects.id }).from(s.projects).where(and(eq(s.projects.slug, slug), isNull(s.projects.deletedAt)));
        if (found.length === 0) {
          await tx.insert(s.projects).values({
            slug,
            title: `${SAMPLE} · پروژه‌ی ${i}`,
            industryId: firstIndustry.id,
            summary: `${SAMPLE}: این پروژه فقط برای دیدن چیدمان است و باید قبل از انتشار با پروژه‌ی واقعی جایگزین شود.`,
            sortOrder: i,
            isFeatured: i <= 2,
          });
        }
      }
    });
    console.log("Sample seed complete (all content is a draft labelled «نمونه»).");
    // This script writes with plain SQL, outside any Server Action, so it cannot expire Next's content cache
    // (updateTag only works inside a Server Action). A running app keeps serving the old pages, including cached 404s,
    // until the tags expire or `revalidate` (3600 s) passes. Restart the app after seeding to start with an empty cache.
    console.log("NOTE: restarting is NOT enough. Next keeps its data cache on disk: delete .next/cache/fetch-cache and .next/server/route-cache (or recreate the container) and restart, or the old pages keep being served.");
  } finally {
    await pool.end();
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
