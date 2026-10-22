import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, isNull, and } from "drizzle-orm";
import pg from "pg";
import { z } from "zod";
import * as s from "../lib/db/schema";

const SAMPLE = "نمونه";

const envSchema = z.object({
  MIGRATOR_DATABASE_URL: z.string().min(1),
  OWNER_EMAIL: z.email(),
  OWNER_PASSWORD: z.string().min(12),
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
      const existingOwner = await tx
        .select({ id: s.users.id })
        .from(s.users)
        .where(and(eq(s.users.email, env.OWNER_EMAIL), isNull(s.users.deletedAt)));
      if (existingOwner.length === 0) {
        await tx.insert(s.users).values({
          email: env.OWNER_EMAIL,
          passwordHash: await hash(env.OWNER_PASSWORD),
          displayName: "مدیر سایت",
          role: "owner",
        });
      }

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
    console.log("Seed complete (all demo content is draft).");
  } finally {
    await pool.end();
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
