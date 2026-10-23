import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { clients, projects, testimonials } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/with-actor";
import { blankToNull } from "@/lib/validation/common";
import type { TestimonialFormValues } from "@/lib/validation/testimonial";
import { ConflictError, expectOne } from "./outcome";
import { refuseSampleContent } from "./sample-content";

export type TestimonialStatus = "draft" | "published" | "archived";

export type TestimonialRow = {
  id: string;
  authorName: string;
  quote: string;
  status: TestimonialStatus;
  version: number;
  consentConfirmed: boolean;
  clientName: string;
};

export async function listTestimonials(db: Db): Promise<TestimonialRow[]> {
  return db
    .select({
      id: testimonials.id,
      authorName: testimonials.authorName,
      quote: testimonials.quote,
      status: testimonials.status,
      version: testimonials.version,
      consentConfirmed: testimonials.consentConfirmed,
      clientName: clients.name,
    })
    .from(testimonials)
    .innerJoin(clients, eq(clients.id, testimonials.clientId))
    .where(isNull(testimonials.deletedAt))
    .orderBy(asc(testimonials.createdAt));
}

export type TestimonialDetail = { id: string; version: number; status: TestimonialStatus; values: TestimonialFormValues };

export async function getTestimonial(db: Db, id: string): Promise<TestimonialDetail | null> {
  const [t] = await db.select().from(testimonials).where(and(eq(testimonials.id, id), isNull(testimonials.deletedAt)));
  if (!t) return null;
  return {
    id: t.id,
    version: t.version,
    status: t.status,
    values: {
      clientId: t.clientId,
      projectId: t.projectId ?? "",
      authorName: t.authorName,
      authorRole: t.authorRole ?? "",
      quote: t.quote,
      consentConfirmed: t.consentConfirmed,
    },
  };
}

/** Projects offered in the form's "about which project" select. */
export async function listProjectChoices(db: Db): Promise<Array<{ id: string; name: string }>> {
  return db.select({ id: projects.id, name: projects.title }).from(projects).where(isNull(projects.deletedAt)).orderBy(asc(projects.title));
}

const columns = (v: TestimonialFormValues) => ({
  clientId: v.clientId,
  projectId: blankToNull(v.projectId),
  authorName: v.authorName,
  authorRole: blankToNull(v.authorRole),
  quote: v.quote,
  consentConfirmed: v.consentConfirmed,
});

export async function createTestimonial(tx: Tx, v: TestimonialFormValues): Promise<string> {
  const [row] = await tx.insert(testimonials).values(columns(v)).returning({ id: testimonials.id });
  return row.id;
}

/** Optimistic lock: throws ConflictError when `version` is stale or the row is gone. */
export async function updateTestimonial(tx: Tx, id: string, version: number, v: TestimonialFormValues): Promise<void> {
  expectOne(
    await tx
      .update(testimonials)
      .set({ ...columns(v), version: sql`${testimonials.version} + 1` })
      .where(and(eq(testimonials.id, id), eq(testimonials.version, version), isNull(testimonials.deletedAt)))
      .returning({ id: testimonials.id }),
  );
}

/** Publishing needs the client's consent (CHECK) and real, non-sample text. */
export async function setTestimonialStatus(tx: Tx, id: string, version: number, status: TestimonialStatus): Promise<void> {
  if (status === "published") {
    const [row] = await tx.select({ authorName: testimonials.authorName, quote: testimonials.quote }).from(testimonials).where(eq(testimonials.id, id));
    if (row) refuseSampleContent(row.authorName, row.quote);
  }
  expectOne(
    await tx
      .update(testimonials)
      .set({ status, version: sql`${testimonials.version} + 1` })
      .where(and(eq(testimonials.id, id), eq(testimonials.version, version), isNull(testimonials.deletedAt)))
      .returning({ id: testimonials.id }),
  );
}

export type DeleteTestimonialResult = { ok: true } | { ok: false; reason: "published" };

/** Soft delete; a published testimonial must be unpublished first (CHECK). */
export async function deleteTestimonial(tx: Tx, id: string, version: number): Promise<DeleteTestimonialResult> {
  const [row] = await tx.select({ status: testimonials.status }).from(testimonials).where(and(eq(testimonials.id, id), isNull(testimonials.deletedAt)));
  if (!row) throw new ConflictError();
  if (row.status === "published") return { ok: false, reason: "published" };
  expectOne(
    await tx
      .update(testimonials)
      .set({ deletedAt: new Date(), version: sql`${testimonials.version} + 1` })
      .where(and(eq(testimonials.id, id), eq(testimonials.version, version)))
      .returning({ id: testimonials.id }),
  );
  return { ok: true };
}
