import { desc, eq, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import type { Tx } from "@/lib/db/with-actor";
import { removeFiles, type MediaAssetRow } from "./ingest";
import { assetFilePaths } from "./variants";

type Executor = Db | Tx;

export type MediaWithUsage = MediaAssetRow & { usageCount: number };

/** `ref` must be a fully qualified reference: inside the sub-selects an unqualified `id` would bind to the wrong table. */
const usageSql = (ref: SQL) => sql<number>`(
  (SELECT count(*) FROM projects WHERE cover_media_id = ${ref})
  + (SELECT count(*) FROM project_media WHERE media_id = ${ref})
  + (SELECT count(*) FROM clients WHERE logo_media_id = ${ref})
  + (SELECT count(*) FROM media_assets p WHERE p.poster_media_id = ${ref})
)::int`;

/** Number of places that reference this asset; any reference makes deletion impossible (FK RESTRICT). */
export async function usageCount(db: Executor, id: string): Promise<number> {
  const res = await db.execute<{ n: number }>(sql`SELECT ${usageSql(sql`${id}::uuid`)} AS n`);
  return res.rows[0].n;
}

export async function listMedia(db: Executor, limit = 60): Promise<MediaWithUsage[]> {
  const rows = await db
    .select({ asset: mediaAssets, usageCount: usageSql(sql.raw('"media_assets"."id"')) })
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.asset, usageCount: r.usageCount }));
}

export type DeleteResult = { ok: true; removedFiles: string[] } | { ok: false; reason: "not_found" | "in_use" };

function isRestrictViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === "23001" || e.cause?.code === "23001";
}

/**
 * Deletes the row first (the database refuses if anything still references it) and only then the files.
 * Call inside the same transaction as the audit actor; files are removed by `removeDeletedFiles` after commit.
 */
export async function deleteMediaRow(db: Executor, id: string): Promise<DeleteResult> {
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!asset) return { ok: false, reason: "not_found" };
  if ((await usageCount(db, id)) > 0) return { ok: false, reason: "in_use" };
  try {
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  } catch (err) {
    if (isRestrictViolation(err)) return { ok: false, reason: "in_use" };
    throw err;
  }
  return { ok: true, removedFiles: assetFilePaths(asset) };
}

export const removeDeletedFiles = removeFiles;
