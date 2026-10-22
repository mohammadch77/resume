import { and, asc, count, eq, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { clients, industries, projects, testimonials } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/with-actor";
import type { ClientFormValues } from "@/lib/validation/client";
import { blankToNull } from "@/lib/validation/common";

export type ClientRow = {
  id: string;
  name: string;
  slug: string;
  industryId: string | null;
  industryName: string | null;
  logoMediaId: string | null;
  websiteUrl: string | null;
  showNamePublicly: boolean;
  usage: number;
};

/** Live projects and testimonials that point at this client. */
async function usageOf(db: Db | Tx, clientId: string): Promise<number> {
  const [p] = await db.select({ n: count() }).from(projects).where(and(eq(projects.clientId, clientId), isNull(projects.deletedAt)));
  const [t] = await db.select({ n: count() }).from(testimonials).where(and(eq(testimonials.clientId, clientId), isNull(testimonials.deletedAt)));
  return p.n + t.n;
}

const select = (db: Db) =>
  db
    .select({
      id: clients.id,
      name: clients.name,
      slug: clients.slug,
      industryId: clients.industryId,
      industryName: industries.name,
      logoMediaId: clients.logoMediaId,
      websiteUrl: clients.websiteUrl,
      showNamePublicly: clients.showNamePublicly,
    })
    .from(clients)
    .leftJoin(industries, eq(industries.id, clients.industryId));

export async function listClients(db: Db): Promise<ClientRow[]> {
  const rows = await select(db).where(isNull(clients.deletedAt)).orderBy(asc(clients.name));
  const usage = await Promise.all(rows.map((r) => usageOf(db, r.id)));
  return rows.map((r, i) => ({ ...r, usage: usage[i] }));
}

export async function getClient(db: Db, id: string): Promise<ClientRow | null> {
  const [row] = await select(db).where(and(eq(clients.id, id), isNull(clients.deletedAt)));
  return row ? { ...row, usage: await usageOf(db, id) } : null;
}

const toColumns = (v: ClientFormValues) => ({
  name: v.name,
  slug: v.slug,
  industryId: blankToNull(v.industryId),
  logoMediaId: blankToNull(v.logoMediaId),
  websiteUrl: blankToNull(v.websiteUrl),
  showNamePublicly: v.showNamePublicly,
});

export async function createClient(tx: Tx, values: ClientFormValues): Promise<string> {
  const [row] = await tx.insert(clients).values(toColumns(values)).returning({ id: clients.id });
  return row.id;
}

/** False when the client no longer exists. */
export async function updateClient(tx: Tx, id: string, values: ClientFormValues): Promise<boolean> {
  const rows = await tx.update(clients).set(toColumns(values)).where(and(eq(clients.id, id), isNull(clients.deletedAt))).returning({ id: clients.id });
  return rows.length === 1;
}

export type DeleteClientResult = { ok: true } | { ok: false; reason: "not_found" } | { ok: false; reason: "in_use"; usage: number };

/** Soft delete; refused while a live project or testimonial still points at the client. */
export async function deleteClient(tx: Tx, id: string): Promise<DeleteClientResult> {
  const usage = await usageOf(tx, id);
  if (usage > 0) return { ok: false, reason: "in_use", usage };
  const rows = await tx.update(clients).set({ deletedAt: new Date() }).where(and(eq(clients.id, id), isNull(clients.deletedAt))).returning({ id: clients.id });
  return rows.length === 1 ? { ok: true } : { ok: false, reason: "not_found" };
}
