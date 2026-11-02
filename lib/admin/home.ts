import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { PUBLISH_GATE_REASONS } from "@/lib/db/errors";
import { clients, heroCards, homeContent, homeStats, mediaAssets } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/with-actor";
import { blankToNull } from "@/lib/validation/common";
import {
  HOME_FORM_BLANK,
  MAX_HERO_CARDS,
  MAX_HOME_STATS,
  hasSampleText,
  type HeroCardValues,
  type HomeFormValues,
  type HomeStatValues,
} from "@/lib/validation/home";
import { BlockedError, ConflictError, expectOne, failed, type Outcome } from "./outcome";

export type HomeAdmin = { version: number; values: HomeFormValues };
type Status = "draft" | "published" | "archived";
export type CardRow = { id: string; version: number; caption: string; title: string; position: number; status: Status };
export type StatRow = { id: string; version: number; value: number; suffix: string; label: string; position: number; status: Status };

/** The singleton (migration 0008 creates it, so it exists in every database; null only if someone deleted it as a superuser). */
export async function getHomeAdmin(db: Db): Promise<HomeAdmin | null> {
  const [r] = await db.select().from(homeContent).where(eq(homeContent.id, 1));
  if (!r) return null;
  return {
    version: r.version,
    values: {
      ...HOME_FORM_BLANK,
      heroEyebrow: r.heroEyebrow,
      heroLine1: r.heroLine1,
      heroLine2: r.heroLine2,
      heroLine3: r.heroLine3,
      heroDescription: r.heroDescription,
      heroSecondaryCtaLabel: r.heroSecondaryCtaLabel,
      aboutEyebrow: r.aboutEyebrow,
      aboutLead: r.aboutLead,
      aboutRest: r.aboutRest,
      workEyebrow: r.workEyebrow,
      workTitle: r.workTitle,
      servicesEyebrow: r.servicesEyebrow,
      servicesTitle: r.servicesTitle,
      statsEyebrow: r.statsEyebrow,
      statsTitle: r.statsTitle,
      bandTitle: r.bandTitle,
      bandText: r.bandText,
      footerTagline: r.footerTagline,
      footerLegal: r.footerLegal,
      heroImageBaseId: r.heroImageBaseId ?? "",
      heroImageHoverId: r.heroImageHoverId ?? "",
      heroRatingScore: r.heroRatingScore === null ? "" : String(r.heroRatingScore),
      heroRatingLabel: r.heroRatingLabel ?? "",
      statusLeft: r.statusLeft ?? "",
      statusCenter: r.statusCenter ?? "",
      statusRight: r.statusRight ?? "",
    },
  };
}

export async function listCards(db: Db): Promise<CardRow[]> {
  const rows = await db.select().from(heroCards).orderBy(asc(heroCards.position));
  return rows.map(({ id, version, caption, title, position, status }) => ({ id, version, caption, title, position, status }));
}

export async function listStats(db: Db): Promise<StatRow[]> {
  const rows = await db.select().from(homeStats).orderBy(asc(homeStats.position));
  return rows.map(({ id, version, value, suffix, label, position, status }) => ({ id, version, value, suffix, label, position, status }));
}

/** Clients that agreed to be named: exactly what the "trusted by" strip reads (edited in the clients module, not here). */
export async function listPartnerNames(db: Db): Promise<string[]> {
  const rows = await db.select({ name: clients.name }).from(clients).where(and(eq(clients.showNamePublicly, true), sql`${clients.deletedAt} IS NULL`)).orderBy(asc(clients.name));
  return rows.map((r) => r.name).filter((n) => !n.trim().startsWith("نمونه"));
}

type ImageField = "heroImageBaseId" | "heroImageHoverId";

/**
 * The two hero pictures, checked before the database does it (same rules as the trigger gw_hero_images_guard, with sentences an editor
 * can act on): both exist, are png/webp/avif images, have alt text and have exactly the same size. Returns a message per field.
 */
export async function checkHeroImages(db: Db | Tx, baseId: string, hoverId: string): Promise<Partial<Record<ImageField, string>>> {
  if (baseId === "" || hoverId === "") return {};
  const rows = await db.select().from(mediaAssets).where(inArray(mediaAssets.id, [baseId, hoverId]));
  const base = rows.find((m) => m.id === baseId);
  const hover = rows.find((m) => m.id === hoverId);
  const errors: Partial<Record<ImageField, string>> = {};
  const check = (m: (typeof rows)[number] | undefined, field: ImageField) => {
    if (!m) errors[field] = "این تصویر پیدا نشد.";
    else if (m.kind !== "image" || !["image/png", "image/webp", "image/avif"].includes(m.mime)) errors[field] = "تصویر هیرو باید PNG، WebP یا AVIF باشد (با پس‌زمینه‌ی شفاف)، نه JPEG یا ویدیو.";
    else if ((m.altFa ?? "").trim() === "") errors[field] = "این تصویر متن جایگزین (alt) ندارد. آن را در بخش رسانه بنویسید.";
  };
  check(base, "heroImageBaseId");
  check(hover, "heroImageHoverId");
  if (base && hover && Object.keys(errors).length === 0 && (base.width !== hover.width || base.height !== hover.height)) {
    errors.heroImageHoverId = `دو تصویر باید دقیقاً هم‌اندازه باشند (${base.width}×${base.height} و ${hover.width}×${hover.height}).`;
  }
  return errors;
}

const homeColumns = (v: HomeFormValues) => ({
  heroEyebrow: v.heroEyebrow,
  heroLine1: v.heroLine1,
  heroLine2: v.heroLine2,
  heroLine3: v.heroLine3,
  heroDescription: v.heroDescription,
  heroSecondaryCtaLabel: v.heroSecondaryCtaLabel,
  aboutEyebrow: v.aboutEyebrow,
  aboutLead: v.aboutLead,
  aboutRest: v.aboutRest,
  workEyebrow: v.workEyebrow,
  workTitle: v.workTitle,
  servicesEyebrow: v.servicesEyebrow,
  servicesTitle: v.servicesTitle,
  statsEyebrow: v.statsEyebrow,
  statsTitle: v.statsTitle,
  bandTitle: v.bandTitle,
  bandText: v.bandText,
  footerTagline: v.footerTagline,
  footerLegal: v.footerLegal,
  heroImageBaseId: v.heroImageBaseId === "" ? null : v.heroImageBaseId,
  heroImageHoverId: v.heroImageHoverId === "" ? null : v.heroImageHoverId,
  heroRatingScore: v.heroRatingScore === "" ? null : Number(v.heroRatingScore),
  heroRatingLabel: blankToNull(v.heroRatingLabel),
  statusLeft: blankToNull(v.statusLeft),
  statusCenter: blankToNull(v.statusCenter),
  statusRight: blankToNull(v.statusRight),
});

/** Optimistic-lock save of the singleton: 0 rows (a stale version) is a conflict, never an overwrite. Returns the new version. */
export async function saveHome(tx: Tx, version: number, values: HomeFormValues): Promise<number> {
  const row = expectOne(
    await tx
      .update(homeContent)
      .set({ ...homeColumns(values), version: sql`${homeContent.version} + 1` })
      .where(and(eq(homeContent.id, 1), eq(homeContent.version, version)))
      .returning({ version: homeContent.version }),
  );
  return row.version;
}

// ------------------------------------------------------------------ the two ordered lists (cards 1..5, figures 1..4)
// Positions are unique (deferrable), so a reorder or the closing of a gap after a delete is several UPDATEs in one transaction. Each
// UPDATE bumps `version` (the trigger demands it). A reorder carries no per-row version: the last one to arrange the list wins.

type ListTable = typeof heroCards | typeof homeStats;

async function compact(tx: Tx, table: ListTable, orderedIds: string[]): Promise<void> {
  for (const [i, id] of orderedIds.entries()) {
    await tx.update(table).set({ position: i + 1, version: sql`${table.version} + 1` }).where(eq(table.id, id));
  }
}

async function idsInOrder(tx: Tx, table: ListTable): Promise<string[]> {
  return (await tx.select({ id: table.id }).from(table).orderBy(asc(table.position))).map((r) => r.id);
}

export async function addCard(tx: Tx, v: HeroCardValues): Promise<string> {
  const ids = await idsInOrder(tx, heroCards);
  if (ids.length >= MAX_HERO_CARDS) throw new BlockedError([`حداکثر ${MAX_HERO_CARDS.toLocaleString("fa-IR")} کارت می‌توان داشت. یکی را حذف کنید.`]);
  const [row] = await tx.insert(heroCards).values({ caption: v.caption, title: v.title, position: ids.length + 1 }).returning({ id: heroCards.id });
  return row.id;
}

export async function addStat(tx: Tx, v: HomeStatValues): Promise<string> {
  const ids = await idsInOrder(tx, homeStats);
  if (ids.length >= MAX_HOME_STATS) throw new BlockedError([`حداکثر ${MAX_HOME_STATS.toLocaleString("fa-IR")} آمار می‌توان داشت. یکی را حذف کنید.`]);
  const [row] = await tx.insert(homeStats).values({ value: Number(v.value), suffix: v.suffix, label: v.label, position: ids.length + 1 }).returning({ id: homeStats.id });
  return row.id;
}

/** A published row cannot be edited into «نمونه» text (the CHECK says so too; the app says it first, in Persian). */
export async function updateCard(tx: Tx, id: string, version: number, v: HeroCardValues): Promise<number> {
  const [cur] = await tx.select({ status: heroCards.status }).from(heroCards).where(eq(heroCards.id, id));
  if (cur?.status === "published" && hasSampleText(v.caption, v.title)) throw new BlockedError([PUBLISH_GATE_REASONS.demo_content]);
  const rows = await tx
    .update(heroCards)
    .set({ caption: v.caption, title: v.title, version: sql`${heroCards.version} + 1` })
    .where(and(eq(heroCards.id, id), eq(heroCards.version, version)))
    .returning({ version: heroCards.version });
  return expectOne(rows).version;
}

export async function updateStat(tx: Tx, id: string, version: number, v: HomeStatValues): Promise<number> {
  const [cur] = await tx.select({ status: homeStats.status }).from(homeStats).where(eq(homeStats.id, id));
  if (cur?.status === "published" && hasSampleText(v.label)) throw new BlockedError([PUBLISH_GATE_REASONS.demo_content]);
  const rows = await tx
    .update(homeStats)
    .set({ value: Number(v.value), suffix: v.suffix, label: v.label, version: sql`${homeStats.version} + 1` })
    .where(and(eq(homeStats.id, id), eq(homeStats.version, version)))
    .returning({ version: homeStats.version });
  return expectOne(rows).version;
}

export async function setCardStatus(tx: Tx, id: string, version: number, status: "draft" | "published"): Promise<number> {
  const [cur] = await tx.select().from(heroCards).where(eq(heroCards.id, id));
  if (status === "published" && cur && hasSampleText(cur.caption, cur.title)) throw new BlockedError([PUBLISH_GATE_REASONS.demo_content]);
  const rows = await tx
    .update(heroCards)
    .set({ status, version: sql`${heroCards.version} + 1` })
    .where(and(eq(heroCards.id, id), eq(heroCards.version, version)))
    .returning({ version: heroCards.version });
  return expectOne(rows).version;
}

export async function setStatStatus(tx: Tx, id: string, version: number, status: "draft" | "published"): Promise<number> {
  const [cur] = await tx.select().from(homeStats).where(eq(homeStats.id, id));
  if (status === "published" && cur && hasSampleText(cur.label)) throw new BlockedError([PUBLISH_GATE_REASONS.demo_content]);
  const rows = await tx
    .update(homeStats)
    .set({ status, version: sql`${homeStats.version} + 1` })
    .where(and(eq(homeStats.id, id), eq(homeStats.version, version)))
    .returning({ version: homeStats.version });
  return expectOne(rows).version;
}

/** Removes the row (the audit log keeps what it was) and closes the gap so positions stay 1..n. */
export async function removeListRow(tx: Tx, kind: "card" | "stat", id: string, version: number): Promise<void> {
  const table = kind === "card" ? heroCards : homeStats;
  const gone = await tx.delete(table).where(and(eq(table.id, id), eq(table.version, version))).returning({ id: table.id });
  if (gone.length !== 1) throw new ConflictError();
  await compact(tx, table, await idsInOrder(tx, table));
}

/** `orderedIds` must be exactly the ids that exist (nothing missing, nothing extra); otherwise the list changed under the editor. */
export async function reorderList(tx: Tx, kind: "card" | "stat", orderedIds: string[]): Promise<Outcome<null>> {
  const table = kind === "card" ? heroCards : homeStats;
  const current = await idsInOrder(tx, table);
  if (current.length !== orderedIds.length || new Set(orderedIds).size !== orderedIds.length || !orderedIds.every((id) => current.includes(id))) {
    return failed("فهرست در این فاصله تغییر کرده است. صفحه را دوباره بارگذاری کنید.");
  }
  await compact(tx, table, orderedIds);
  return { kind: "ok", value: null };
}
