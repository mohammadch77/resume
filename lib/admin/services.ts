import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { projects, projectServices, services } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/with-actor";
import { ConflictError, expectOne } from "./outcome";
import { refuseSampleContent } from "./sample-content";

export type ServiceStatus = "draft" | "published" | "archived";
export type ServiceInput = { title: string; slug: string; summary: string; iconKey: string };

export type ServiceRow = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  iconKey: string;
  status: ServiceStatus;
  version: number;
  sortOrder: number;
  usage: number;
};

const columns = {
  id: services.id,
  title: services.title,
  slug: services.slug,
  summary: services.summary,
  iconKey: services.iconKey,
  status: services.status,
  version: services.version,
  sortOrder: services.sortOrder,
};

/** Number of live projects that list this service. */
async function usageOf(db: Db | Tx, serviceId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(projectServices)
    .innerJoin(projects, eq(projects.id, projectServices.projectId))
    .where(and(eq(projectServices.serviceId, serviceId), isNull(projects.deletedAt)));
  return row.n;
}

export async function listServices(db: Db): Promise<ServiceRow[]> {
  const rows = await db.select(columns).from(services).where(isNull(services.deletedAt)).orderBy(asc(services.sortOrder), asc(services.createdAt));
  const usage = await Promise.all(rows.map((r) => usageOf(db, r.id)));
  return rows.map((r, i) => ({ ...r, usage: usage[i] }));
}

export async function getService(db: Db, id: string): Promise<ServiceRow | null> {
  const [row] = await db.select(columns).from(services).where(and(eq(services.id, id), isNull(services.deletedAt)));
  return row ? { ...row, usage: await usageOf(db, id) } : null;
}

/** New services start as drafts at the end of the list. */
export async function createService(tx: Tx, input: ServiceInput): Promise<string> {
  const [{ next }] = await tx
    .select({ next: sql<number>`coalesce(max(${services.sortOrder}) + 1, 0)::int` })
    .from(services)
    .where(isNull(services.deletedAt));
  const [row] = await tx.insert(services).values({ ...input, sortOrder: next }).returning({ id: services.id });
  return row.id;
}

/** Optimistic lock: throws ConflictError when `version` is no longer current (or the row is gone). */
export async function updateService(tx: Tx, id: string, version: number, input: ServiceInput): Promise<void> {
  expectOne(
    await tx
      .update(services)
      .set({ ...input, version: sql`${services.version} + 1` })
      .where(and(eq(services.id, id), eq(services.version, version), isNull(services.deletedAt)))
      .returning({ id: services.id }),
  );
}

/** The status trigger rejects illegal transitions (GW002). */
export async function setServiceStatus(tx: Tx, id: string, version: number, status: ServiceStatus): Promise<void> {
  if (status === "published") {
    const [row] = await tx.select({ title: services.title, summary: services.summary }).from(services).where(eq(services.id, id));
    if (row) refuseSampleContent(row.title, row.summary);
  }
  expectOne(
    await tx
      .update(services)
      .set({ status, version: sql`${services.version} + 1` })
      .where(and(eq(services.id, id), eq(services.version, version), isNull(services.deletedAt)))
      .returning({ id: services.id }),
  );
}

/** Moves one step up or down and renumbers the list 0..n-1 so ties never leave the order ambiguous. */
export async function moveService(tx: Tx, id: string, direction: "up" | "down"): Promise<boolean> {
  const rows = await tx
    .select({ id: services.id, sortOrder: services.sortOrder })
    .from(services)
    .where(isNull(services.deletedAt))
    .orderBy(asc(services.sortOrder), asc(services.createdAt));
  const from = rows.findIndex((r) => r.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= rows.length) return false;
  const order = rows.map((r) => r.id);
  [order[from], order[to]] = [order[to], order[from]];
  for (const [index, serviceId] of order.entries()) {
    await tx
      .update(services)
      .set({ sortOrder: index, version: sql`${services.version} + 1` })
      .where(and(eq(services.id, serviceId), sql`${services.sortOrder} <> ${index}`));
  }
  return true;
}

export type DeleteServiceResult = { ok: true } | { ok: false; reason: "published" | "in_use"; usage?: number };

/** Soft delete. A published service must be unpublished first (CHECK), and one used by a live project is kept. */
export async function deleteService(tx: Tx, id: string, version: number): Promise<DeleteServiceResult> {
  const [row] = await tx.select({ status: services.status }).from(services).where(and(eq(services.id, id), isNull(services.deletedAt)));
  if (!row) throw new ConflictError();
  if (row.status === "published") return { ok: false, reason: "published" };
  const usage = await usageOf(tx, id);
  if (usage > 0) return { ok: false, reason: "in_use", usage };
  expectOne(
    await tx
      .update(services)
      .set({ deletedAt: new Date(), version: sql`${services.version} + 1` })
      .where(and(eq(services.id, id), eq(services.version, version)))
      .returning({ id: services.id }),
  );
  return { ok: true };
}
