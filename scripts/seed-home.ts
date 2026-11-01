import { drizzle } from "drizzle-orm/node-postgres";
import { readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { z } from "zod";
import type { Db } from "../lib/db/client";
import * as schema from "../lib/db/schema";
import { ingestImage } from "../lib/media/ingest";

/**
 * `npm run seed:home [-- --images] [-- --sample]`: adds to the landing's singleton row (created by migration 0008) what a migration must not
 * carry. Idempotent: nothing already set is overwritten, so edits made in the admin survive.
 *   --images  also uploads the two hero pictures of design/reference/hero through the media pipeline and sets them, if none is set.
 *             The rights to these two pictures are NOT confirmed (docs/BACKLOG.md, launch blocker): for development and tests.
 *   --sample  also adds draft hero cards and figures labelled «نمونه» (they can not be published as they are).
 */
const HERO_DIR = path.resolve("design", "reference", "hero"); // scripts run from the repository root

export const HERO_ALT = {
  base: "طرح خطی یک صفحه‌ی وب روی صفحه‌ی مانیتور",
  hover: "همان صفحه‌ی وب روی مانیتور، با طرح رنگی",
} as const;

type Options = { uploadsDir: string; images?: boolean; sample?: boolean };

export async function seedHome(pool: pg.Pool, { uploadsDir, images = false, sample = false }: Options): Promise<string[]> {
  const done: string[] = [];
  // the row itself comes from migration 0008; this script only adds what a migration must not: the pictures and the sample rows
  const row = await pool.query("SELECT 1 FROM home_content WHERE id = 1");
  if (!row.rowCount) throw new Error("home_content has no row: run `npm run db:migrate` first (migration 0008 creates it).");
  done.push("home_content row present");

  if (images) {
    const current = await pool.query<{ hero_image_base_id: string | null }>("SELECT hero_image_base_id FROM home_content WHERE id = 1");
    if (current.rows[0].hero_image_base_id) {
      done.push("hero pictures already set, left untouched");
    } else {
      const owner = await pool.query<{ id: string }>("SELECT id FROM users WHERE role = 'owner' AND deleted_at IS NULL ORDER BY created_at LIMIT 1");
      if (!owner.rows[0]) throw new Error("No owner account yet: run `npm run seed:owner` first (an upload needs an uploader).");
      const db = drizzle(pool, { schema }) as Db;
      const ctx = { db, uploadsDir, userId: owner.rows[0].id, requestId: "seed-home" };
      const base = await ingestImage(ctx, readFileSync(path.join(HERO_DIR, "hero-sketch.png")));
      const hover = await ingestImage(ctx, readFileSync(path.join(HERO_DIR, "hero-bold.png")));
      await pool.query("UPDATE media_assets SET alt_fa = $2 WHERE id = $1", [base.asset.id, HERO_ALT.base]);
      await pool.query("UPDATE media_assets SET alt_fa = $2 WHERE id = $1", [hover.asset.id, HERO_ALT.hover]);
      await pool.query("UPDATE home_content SET hero_image_base_id = $1, hero_image_hover_id = $2, version = version + 1 WHERE id = 1", [base.asset.id, hover.asset.id]);
      done.push("hero pictures uploaded and set");
    }
  }

  if (sample) {
    const cards = await pool.query("SELECT 1 FROM hero_cards LIMIT 1");
    if (!cards.rowCount) {
      const rows: Array<[string, string]> = [["نمونه · طراحی", "برای تبدیل بازدیدکننده به مشتری."], ["نمونه · توسعه", "برای رشد بدون دردسر."], ["نمونه · برند", "برای ماندن در ذهن‌ها."]];
      for (const [i, [caption, title]] of rows.entries()) await pool.query("INSERT INTO hero_cards (caption, title, position) VALUES ($1, $2, $3)", [caption, title, i + 1]);
      done.push("3 sample hero cards (draft)");
    }
    const stats = await pool.query("SELECT 1 FROM home_stats LIMIT 1");
    if (!stats.rowCount) {
      const rows: Array<[number, string, string]> = [[150, "+", "نمونه · پروژه‌ی تحویل‌شده"], [98, "٪", "نمونه · رضایت مشتری"], [12, "", "نمونه · سال تجربه"], [40, "+", "نمونه · عضو تیم"]];
      for (const [i, [value, suffix, label]] of rows.entries()) await pool.query("INSERT INTO home_stats (value, suffix, label, position) VALUES ($1, $2, $3, $4)", [value, suffix, label, i + 1]);
      done.push("4 sample figures (draft)");
    }
  }
  return done;
}

async function main() {
  const env = z.object({ MIGRATOR_DATABASE_URL: z.string().min(1), UPLOADS_DIR: z.string().default("./uploads") }).parse(process.env);
  const pool = new pg.Pool({ connectionString: env.MIGRATOR_DATABASE_URL, max: 2 });
  try {
    for (const line of await seedHome(pool, { uploadsDir: env.UPLOADS_DIR, images: process.argv.includes("--images"), sample: process.argv.includes("--sample") })) console.log(line);
    // Plain SQL outside a Server Action cannot expire Next's content cache (updateTag only works inside one).
    console.log("NOTE: if the app has run before, delete .next/cache/fetch-cache and .next/server/route-cache (or recreate the container) and restart it.");
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && /seed-home\.ts$/.test(process.argv[1].replaceAll("\\", "/"))) {
  main().catch((err: Error) => {
    console.error(err.message);
    process.exit(1);
  });
}
