import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { z } from "zod";
import { HOME_TEXT_DEFAULTS } from "../lib/content/home-defaults";
import * as s from "../lib/db/schema";

/**
 * Creates the singleton `site_settings` row of a real deployment (`seed-settings`): brand «Scene Studio», the page's real default copy (no
 * «نمونه» text, so nothing in it blocks publishing) and the primary CTA label. Contact details and socials stay empty: the owner fills them in
 * the admin. Idempotent: an existing row is left untouched (the owner's edits are never overwritten). Prints nothing secret.
 */
const envSchema = z.object({ MIGRATOR_DATABASE_URL: z.string().min(1) });

async function main() {
  const env = envSchema.parse(process.env);
  const pool = new pg.Pool({ connectionString: env.MIGRATOR_DATABASE_URL, max: 1 });
  const db = drizzle(pool, { schema: s });
  try {
    const created = await db
      .insert(s.siteSettings)
      .values({
        id: 1,
        brandName: "Scene Studio",
        heroTitle: `${HOME_TEXT_DEFAULTS.heroLine1} ${HOME_TEXT_DEFAULTS.heroLine2} ${HOME_TEXT_DEFAULTS.heroLine3}`,
        heroSubtitle: HOME_TEXT_DEFAULTS.heroDescription,
        primaryCtaLabel: "درخواست مشاوره رایگان",
      })
      .onConflictDoNothing()
      .returning({ id: s.siteSettings.id });
    console.log(created.length ? "Site settings created (brand: Scene Studio)." : "Site settings already exist; nothing changed.");
  } finally {
    await pool.end();
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
