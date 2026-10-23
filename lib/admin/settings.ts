import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { siteSettings } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/with-actor";
import { blankToNull } from "@/lib/validation/common";
import { SOCIAL_KEYS, type SettingsFormValues } from "@/lib/validation/settings";
import { ConflictError, expectOne } from "./outcome";

export type SettingsDetail = { version: number; values: SettingsFormValues };

const emptySocials = (): SettingsFormValues["socials"] => Object.fromEntries(SOCIAL_KEYS.map((k) => [k, ""])) as SettingsFormValues["socials"];

/** The singleton row, or null before the first save (a fresh production database has none). */
export async function getSettings(db: Db): Promise<SettingsDetail | null> {
  const [s] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
  if (!s) return null;
  return {
    version: s.version,
    values: {
      brandName: s.brandName,
      heroTitle: s.heroTitle,
      heroSubtitle: s.heroSubtitle,
      primaryCtaLabel: s.primaryCtaLabel,
      contactPhone: s.contactPhone ?? "",
      contactEmail: s.contactEmail ?? "",
      contactAddress: s.contactAddress ?? "",
      socials: { ...emptySocials(), ...s.socials },
      seoTitle: s.seoTitle ?? "",
      seoDescription: s.seoDescription ?? "",
    },
  };
}

const columns = (v: SettingsFormValues) => ({
  brandName: v.brandName,
  heroTitle: v.heroTitle,
  heroSubtitle: v.heroSubtitle,
  primaryCtaLabel: v.primaryCtaLabel,
  contactPhone: blankToNull(v.contactPhone),
  contactEmail: blankToNull(v.contactEmail),
  contactAddress: blankToNull(v.contactAddress),
  // Only filled networks are stored: the CHECK rejects empty strings.
  socials: Object.fromEntries(SOCIAL_KEYS.flatMap((k) => (v.socials[k].trim() === "" ? [] : [[k, v.socials[k].trim()]]))),
  seoTitle: blankToNull(v.seoTitle),
  seoDescription: blankToNull(v.seoDescription),
});

/**
 * Saves the singleton. `version` undefined means "the row does not exist yet" and creates it; if someone created it
 * in the meantime (or the version is stale) the caller gets a ConflictError instead of an overwrite.
 */
export async function saveSettings(tx: Tx, version: number | undefined, values: SettingsFormValues): Promise<void> {
  if (version === undefined) {
    const created = await tx.insert(siteSettings).values({ id: 1, ...columns(values) }).onConflictDoNothing().returning({ id: siteSettings.id });
    if (created.length !== 1) throw new ConflictError();
    return;
  }
  expectOne(
    await tx
      .update(siteSettings)
      .set({ ...columns(values), version: sql`${siteSettings.version} + 1` })
      .where(and(eq(siteSettings.id, 1), eq(siteSettings.version, version)))
      .returning({ id: siteSettings.id }),
  );
}
