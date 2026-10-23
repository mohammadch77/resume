import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import { inject } from "vitest";

export type Pools = { su: pg.Pool; migrator: pg.Pool; app: pg.Pool; close: () => Promise<void> };

function url(user: string, password: string): string {
  const host = inject("baseUrl").replace(/^postgres:\/\/[^@]*@/, "");
  return `postgres://${user}:${password}@${host}/${inject("dbName")}`;
}

export function connect(): Pools {
  const su = new pg.Pool({ connectionString: url("postgres", "postgres"), max: 4 });
  const migrator = new pg.Pool({ connectionString: url("migrator", "migrator"), max: 2 });
  const app = new pg.Pool({ connectionString: url("app_rw", "app_rw"), max: 4 });
  return {
    su,
    migrator,
    app,
    close: async () => {
      await Promise.all([su.end(), migrator.end(), app.end()]);
    },
  };
}

export const uid = () => randomBytes(4).toString("hex");
export const sha = () => createHash("sha256").update(randomBytes(16)).digest("hex");

/** Runs the statement and returns the PG error (code/message) it raised, or fails the test if it succeeded. */
export async function rejected(p: Promise<unknown>): Promise<{ code: string; message: string }> {
  try {
    await p;
  } catch (err) {
    const e = err as { code?: string; message: string };
    return { code: e.code ?? "", message: e.message };
  }
  throw new Error("statement was expected to be rejected but succeeded");
}

export const CHECK_VIOLATION = "23514";
export const UNIQUE_VIOLATION = "23505";
export const FK_VIOLATION = "23503";
export const RESTRICT_VIOLATION = "23001";
export const NOT_NULL_VIOLATION = "23502";
export const INSUFFICIENT_PRIVILEGE = "42501";
export const E = { version: "GW001", transition: "GW002", gate: "GW003", appendOnly: "GW004", retention: "GW005", lastOwner: "GW007", inUse: "GW008" } as const;

// ---- fixtures (inserted with the superuser pool; triggers still fire) ----
export async function mkUser(db: pg.Pool, role: "owner" | "editor" = "editor"): Promise<string> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, display_name, role) VALUES ($1, $2, 'تست', $3) RETURNING id`,
    [`u${uid()}@example.com`, "x".repeat(40), role],
  );
  return r.rows[0].id;
}

export async function mkMedia(db: pg.Pool, userId: string, opts: { alt?: string | null } = {}): Promise<string> {
  const alt = opts.alt === undefined ? "تصویر نمونه" : opts.alt;
  const r = await db.query<{ id: string }>(
    `INSERT INTO media_assets (kind, mime, bytes, width, height, alt_fa, sha256, original_path, uploaded_by)
     VALUES ('image', 'image/webp', 1000, 100, 100, $1, $2, $3, $4) RETURNING id`,
    [alt, sha(), `a/${uid()}.webp`, userId],
  );
  return r.rows[0].id;
}

export async function mkIndustry(db: pg.Pool): Promise<string> {
  const r = await db.query<{ id: string }>(`INSERT INTO industries (slug, name) VALUES ($1, 'حوزه') RETURNING id`, [`ind-${uid()}`]);
  return r.rows[0].id;
}

export async function mkService(db: pg.Pool): Promise<string> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO services (slug, title, summary, icon_key) VALUES ($1, 'سرویس', 'توضیح', 'globe') RETURNING id`,
    [`svc-${uid()}`],
  );
  return r.rows[0].id;
}

export async function mkClient(db: pg.Pool): Promise<string> {
  const r = await db.query<{ id: string }>(`INSERT INTO clients (name, slug) VALUES ('مشتری', $1) RETURNING id`, [`cl-${uid()}`]);
  return r.rows[0].id;
}

export async function mkProject(db: pg.Pool, industryId: string, over: Partial<{ slug: string; summary: string }> = {}): Promise<string> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO projects (slug, title, industry_id, summary) VALUES ($1, 'پروژه', $2, $3) RETURNING id`,
    [over.slug ?? `p-${uid()}`, industryId, over.summary ?? "خلاصه‌ی یک پروژه‌ی نمونه با طول کافی"],
  );
  return r.rows[0].id;
}

/** A project that satisfies the whole publish gate while still in `draft`. */
export async function mkPublishableProject(db: pg.Pool): Promise<{ id: string; userId: string; coverId: string; serviceId: string }> {
  const userId = await mkUser(db);
  const coverId = await mkMedia(db, userId);
  const industryId = await mkIndustry(db);
  const serviceId = await mkService(db);
  const id = await mkProject(db, industryId);
  await db.query(`UPDATE projects SET cover_media_id = $2, published_at = now(), version = version + 1 WHERE id = $1`, [id, coverId]);
  await db.query(`INSERT INTO project_services (project_id, service_id) VALUES ($1, $2)`, [id, serviceId]);
  return { id, userId, coverId, serviceId };
}

export { randomUUID };
