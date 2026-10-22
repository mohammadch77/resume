import { and, count, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { clients, industries, projectTech, projects, techTags } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/with-actor";

export type TaxonomyKind = "industry" | "tech";

export type TaxonomyRow = { id: string; slug: string; name: string; usage: number };

/** industries and tech_tags have identical columns; one table type keeps the helpers below free of unions. */
function tableFor(kind: TaxonomyKind): typeof industries {
  return (kind === "industry" ? industries : techTags) as unknown as typeof industries;
}

/** Active (not soft-deleted) projects, and for industries also clients, that still point at this row. */
async function usageCounts(db: Db | Tx, kind: TaxonomyKind, ids: string[]): Promise<Map<string, number>> {
  const usage = new Map<string, number>();
  if (ids.length === 0) return usage;
  const add = (id: string | null, n: number) => {
    if (id) usage.set(id, (usage.get(id) ?? 0) + n);
  };
  if (kind === "industry") {
    const byProject = await db
      .select({ id: projects.industryId, n: count() })
      .from(projects)
      .where(and(inArray(projects.industryId, ids), isNull(projects.deletedAt)))
      .groupBy(projects.industryId);
    const byClient = await db
      .select({ id: clients.industryId, n: count() })
      .from(clients)
      .where(and(inArray(clients.industryId, ids), isNull(clients.deletedAt)))
      .groupBy(clients.industryId);
    for (const r of [...byProject, ...byClient]) add(r.id, r.n);
  } else {
    const rows = await db
      .select({ id: projectTech.techTagId, n: count() })
      .from(projectTech)
      .innerJoin(projects, eq(projects.id, projectTech.projectId))
      .where(and(inArray(projectTech.techTagId, ids), isNull(projects.deletedAt)))
      .groupBy(projectTech.techTagId);
    for (const r of rows) add(r.id, r.n);
  }
  return usage;
}

export async function listTaxonomy(db: Db, kind: TaxonomyKind): Promise<TaxonomyRow[]> {
  const t = tableFor(kind);
  const rows = await db.select({ id: t.id, slug: t.slug, name: t.name }).from(t).where(isNull(t.deletedAt)).orderBy(t.name);
  const usage = await usageCounts(db, kind, rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, usage: usage.get(r.id) ?? 0 }));
}

export async function createTaxonomy(tx: Tx, kind: TaxonomyKind, input: { name: string; slug: string }): Promise<string> {
  const t = tableFor(kind);
  const [row] = await tx.insert(t).values(input).returning({ id: t.id });
  return row.id;
}

/** False when the row does not exist (or is already deleted). */
export async function updateTaxonomy(tx: Tx, kind: TaxonomyKind, id: string, input: { name: string; slug: string }): Promise<boolean> {
  const t = tableFor(kind);
  const rows = await tx.update(t).set(input).where(and(eq(t.id, id), isNull(t.deletedAt))).returning({ id: t.id });
  return rows.length === 1;
}

export type DeleteResult = { ok: true } | { ok: false; reason: "not_found" } | { ok: false; reason: "in_use"; usage: number };

/**
 * Soft delete. Soft deletion does not trip the foreign keys, so "still in use" is checked here:
 * a deleted industry or tag must never stay attached to a live project or client.
 */
export async function deleteTaxonomy(tx: Tx, kind: TaxonomyKind, id: string): Promise<DeleteResult> {
  const usage = (await usageCounts(tx, kind, [id])).get(id) ?? 0;
  if (usage > 0) return { ok: false, reason: "in_use", usage };
  const t = tableFor(kind);
  const rows = await tx.update(t).set({ deletedAt: new Date() }).where(and(eq(t.id, id), isNull(t.deletedAt))).returning({ id: t.id });
  return rows.length === 1 ? { ok: true } : { ok: false, reason: "not_found" };
}
