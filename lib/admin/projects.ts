import { and, asc, count, eq, isNull, notInArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { clients, industries, projectMedia, projectMetrics, projects, projectServices, projectTech, testimonials } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/with-actor";
import { blankToNull } from "@/lib/validation/common";
import { formatJalaliInput, parseJalaliInput, type ProjectFormValues } from "@/lib/validation/project";
import { ConflictError, expectOne } from "./outcome";
import { refuseSampleContent } from "./sample-content";

export type ProjectStatus = "draft" | "published" | "archived";

export type ProjectListRow = {
  id: string;
  title: string;
  slug: string;
  status: ProjectStatus;
  version: number;
  isFeatured: boolean;
  clientName: string | null;
  industryName: string;
};

export async function listProjects(db: Db): Promise<ProjectListRow[]> {
  return db
    .select({
      id: projects.id,
      title: projects.title,
      slug: projects.slug,
      status: projects.status,
      version: projects.version,
      isFeatured: projects.isFeatured,
      clientName: clients.name,
      industryName: industries.name,
    })
    .from(projects)
    .innerJoin(industries, eq(industries.id, projects.industryId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(isNull(projects.deletedAt))
    .orderBy(asc(projects.sortOrder), asc(projects.createdAt));
}

export type ProjectDetail = { id: string; version: number; status: ProjectStatus; values: ProjectFormValues };

export async function getProject(db: Db, id: string): Promise<ProjectDetail | null> {
  const [p] = await db.select().from(projects).where(and(eq(projects.id, id), isNull(projects.deletedAt)));
  if (!p) return null;
  const [services, tags, gallery, metrics] = await Promise.all([
    db.select({ id: projectServices.serviceId }).from(projectServices).where(eq(projectServices.projectId, id)),
    db.select({ id: projectTech.techTagId }).from(projectTech).where(eq(projectTech.projectId, id)),
    db.select({ mediaId: projectMedia.mediaId, caption: projectMedia.caption }).from(projectMedia).where(eq(projectMedia.projectId, id)).orderBy(asc(projectMedia.position)),
    db.select({ label: projectMetrics.label, value: projectMetrics.valueText }).from(projectMetrics).where(eq(projectMetrics.projectId, id)).orderBy(asc(projectMetrics.position)),
  ]);
  return {
    id: p.id,
    version: p.version,
    status: p.status,
    values: {
      title: p.title,
      slug: p.slug,
      clientId: p.clientId ?? "",
      industryId: p.industryId,
      summary: p.summary,
      challenge: p.challenge,
      solution: p.solution,
      outcome: p.outcome,
      completedOn: formatJalaliInput(p.completedOn),
      liveUrl: p.liveUrl ?? "",
      coverMediaId: p.coverMediaId ?? "",
      isFeatured: p.isFeatured,
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
      serviceIds: services.map((s) => s.id),
      techTagIds: tags.map((t) => t.id),
      gallery: gallery.map((g) => ({ mediaId: g.mediaId, caption: g.caption ?? "" })),
      metrics,
    },
  };
}

const columns = (v: ProjectFormValues) => ({
  title: v.title,
  slug: v.slug,
  clientId: blankToNull(v.clientId),
  industryId: v.industryId,
  summary: v.summary,
  challenge: v.challenge,
  solution: v.solution,
  outcome: v.outcome,
  completedOn: v.completedOn.trim() === "" ? null : parseJalaliInput(v.completedOn),
  liveUrl: blankToNull(v.liveUrl),
  coverMediaId: blankToNull(v.coverMediaId),
  isFeatured: v.isFeatured,
  seoTitle: blankToNull(v.seoTitle),
  seoDescription: blankToNull(v.seoDescription),
});

/**
 * Makes the join rows equal the form. Services and tags are diffed (new ones inserted BEFORE the removed ones are
 * deleted, so a published project never passes through "no service"); gallery and metrics are rewritten with
 * positions 0..n-1 (the position uniques are deferred, so one transaction is enough).
 */
async function replaceRelations(tx: Tx, id: string, v: ProjectFormValues): Promise<void> {
  if (v.serviceIds.length) await tx.insert(projectServices).values(v.serviceIds.map((serviceId) => ({ projectId: id, serviceId }))).onConflictDoNothing();
  await tx.delete(projectServices).where(v.serviceIds.length ? and(eq(projectServices.projectId, id), notInArray(projectServices.serviceId, v.serviceIds)) : eq(projectServices.projectId, id));

  if (v.techTagIds.length) await tx.insert(projectTech).values(v.techTagIds.map((techTagId) => ({ projectId: id, techTagId }))).onConflictDoNothing();
  await tx.delete(projectTech).where(v.techTagIds.length ? and(eq(projectTech.projectId, id), notInArray(projectTech.techTagId, v.techTagIds)) : eq(projectTech.projectId, id));

  await tx.delete(projectMedia).where(eq(projectMedia.projectId, id));
  if (v.gallery.length) {
    await tx.insert(projectMedia).values(v.gallery.map((g, position) => ({ projectId: id, mediaId: g.mediaId, position, caption: blankToNull(g.caption) })));
  }
  await tx.delete(projectMetrics).where(eq(projectMetrics.projectId, id));
  if (v.metrics.length) {
    await tx.insert(projectMetrics).values(v.metrics.map((m, position) => ({ projectId: id, label: m.label, valueText: m.value, position })));
  }
}

/** New projects are drafts at the end of the list. */
export async function createProject(tx: Tx, v: ProjectFormValues): Promise<string> {
  const [{ next }] = await tx.select({ next: sql<number>`coalesce(max(${projects.sortOrder}) + 1, 0)::int` }).from(projects).where(isNull(projects.deletedAt));
  const [row] = await tx.insert(projects).values({ ...columns(v), sortOrder: next }).returning({ id: projects.id });
  await replaceRelations(tx, row.id, v);
  return row.id;
}

/** Optimistic lock: throws ConflictError when `version` is stale or the project is gone. */
export async function updateProject(tx: Tx, id: string, version: number, v: ProjectFormValues): Promise<void> {
  expectOne(
    await tx
      .update(projects)
      .set({ ...columns(v), version: sql`${projects.version} + 1` })
      .where(and(eq(projects.id, id), eq(projects.version, version), isNull(projects.deletedAt)))
      .returning({ id: projects.id }),
  );
  await replaceRelations(tx, id, v);
}

/** Publishing stamps `published_at` the first time; the database refuses when the publish gate is not met (GW003). */
export async function setProjectStatus(tx: Tx, id: string, version: number, status: ProjectStatus): Promise<void> {
  if (status === "published") {
    const [row] = await tx.select({ title: projects.title, summary: projects.summary }).from(projects).where(eq(projects.id, id));
    if (row) refuseSampleContent(row.title, row.summary);
  }
  expectOne(
    await tx
      .update(projects)
      .set({
        status,
        version: sql`${projects.version} + 1`,
        ...(status === "published" ? { publishedAt: sql`coalesce(${projects.publishedAt}, now())` } : {}),
      })
      .where(and(eq(projects.id, id), eq(projects.version, version), isNull(projects.deletedAt)))
      .returning({ id: projects.id }),
  );
}

/** One step up or down, then renumber 0..n-1 so ties never leave the order ambiguous. */
export async function moveProject(tx: Tx, id: string, direction: "up" | "down"): Promise<boolean> {
  const rows = await tx.select({ id: projects.id }).from(projects).where(isNull(projects.deletedAt)).orderBy(asc(projects.sortOrder), asc(projects.createdAt));
  const from = rows.findIndex((r) => r.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= rows.length) return false;
  const order = rows.map((r) => r.id);
  [order[from], order[to]] = [order[to], order[from]];
  for (const [index, projectId] of order.entries()) {
    await tx
      .update(projects)
      .set({ sortOrder: index, version: sql`${projects.version} + 1` })
      .where(and(eq(projects.id, projectId), sql`${projects.sortOrder} <> ${index}`));
  }
  return true;
}

export type DeleteProjectResult = { ok: true } | { ok: false; reason: "published" | "in_use"; usage?: number };

/** Soft delete. A published project must be unpublished first (CHECK); one a live testimonial points at is kept. */
export async function deleteProject(tx: Tx, id: string, version: number): Promise<DeleteProjectResult> {
  const [row] = await tx.select({ status: projects.status }).from(projects).where(and(eq(projects.id, id), isNull(projects.deletedAt)));
  if (!row) throw new ConflictError();
  if (row.status === "published") return { ok: false, reason: "published" };
  const [{ n }] = await tx
    .select({ n: count() })
    .from(testimonials)
    .where(and(eq(testimonials.projectId, id), isNull(testimonials.deletedAt)));
  if (n > 0) return { ok: false, reason: "in_use", usage: n };
  expectOne(
    await tx
      .update(projects)
      .set({ deletedAt: new Date(), version: sql`${projects.version} + 1` })
      .where(and(eq(projects.id, id), eq(projects.version, version)))
      .returning({ id: projects.id }),
  );
  return { ok: true };
}
