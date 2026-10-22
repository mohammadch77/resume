/**
 * Turns database errors into something an editor can act on. Constraint names and SQLSTATEs are documented in
 * drizzle/migrations (GW001 version conflict, GW002 illegal transition, GW003 publish gate, GW004 append-only,
 * GW005 retention, GW006 wrong media kind, 23001 RESTRICT, 23505 unique).
 */
export type PgErr = { code?: string; constraint?: string; message: string };

/** Finds the underlying `pg` error inside Drizzle's wrapper(s). */
export function pgError(err: unknown): PgErr | null {
  let cur: unknown = err;
  for (let depth = 0; depth < 5 && cur && typeof cur === "object"; depth += 1) {
    const e = cur as { code?: unknown; constraint?: unknown; message?: unknown; cause?: unknown };
    if (typeof e.code === "string") {
      return { code: e.code, constraint: typeof e.constraint === "string" ? e.constraint : undefined, message: typeof e.message === "string" ? e.message : "" };
    }
    cur = e.cause;
  }
  return null;
}

/** Why a project / service / testimonial cannot be published, in Persian, keyed by the code in the trigger message. */
export const PUBLISH_GATE_REASONS: Record<string, string> = {
  cover: "کاور انتخاب نشده است.",
  cover_alt: "برای تصویر کاور متن جایگزین (alt) نوشته نشده است.",
  services: "دست‌کم یک خدمت باید انتخاب شود.",
  published_at: "تاریخ انتشار ثبت نشده است.",
  summary_length: "خلاصه باید دست‌کم ۲۰ حرف باشد.",
  demo_content: "این محتوای «نمونه» است؛ ابتدا آن را با محتوای واقعی جایگزین کنید.",
  consent: "رضایت مشتری برای انتشار تأیید نشده است.",
};

/** `publish_gate: cover,services` -> ["کاور انتخاب نشده است.", "دست‌کم یک خدمت …"] */
export function publishGateReasons(message: string): string[] {
  const m = /publish_gate:\s*([a-z_,\s]+)/.exec(message);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((code) => PUBLISH_GATE_REASONS[code] ?? `شرط انتشار برقرار نیست (${code}).`);
}

/** Unique-index name -> the form field it belongs to. */
const UNIQUE_FIELDS: Array<[RegExp, string, string]> = [
  [/slug_active_uq$/, "slug", "این نشانی (slug) قبلاً استفاده شده است."],
  [/users_email_active_uq$/, "email", "این ایمیل قبلاً ثبت شده است."],
  [/project_media_media_uq$/, "gallery", "یک فایل را نمی‌توان دو بار در گالری گذاشت."],
  [/_position_uq$/, "position", "ترتیب تکراری است."],
];

export type DbProblem =
  | { kind: "conflict" }
  | { kind: "blocked"; reasons: string[] }
  | { kind: "failed"; message: string; field?: string };

export function describeDbError(err: unknown): DbProblem | null {
  const e = pgError(err);
  if (!e?.code) return null;
  switch (e.code) {
    case "GW001":
      return { kind: "conflict" };
    case "GW002":
      return { kind: "failed", message: "این تغییر وضعیت مجاز نیست." };
    case "GW003": {
      const reasons = publishGateReasons(e.message);
      return { kind: "blocked", reasons: reasons.length ? reasons : ["شرط‌های انتشار برقرار نیست."] };
    }
    case "GW006":
      return { kind: "failed", message: "این نوع فایل برای این بخش مجاز نیست (کاور و لوگو فقط تصویر هستند)." };
    case "GW004":
      return { kind: "failed", message: "گزارش تغییرات قابل ویرایش یا حذف نیست." };
    case "GW005":
      return { kind: "failed", message: "این درخواست هنوز در دوره‌ی نگهداری است و حذف نمی‌شود." };
    case "23001":
    case "23503":
      return { kind: "failed", message: "این مورد جای دیگری استفاده شده است. ابتدا آن را از همه‌ی جاها بردارید." };
    case "23505": {
      const hit = UNIQUE_FIELDS.find(([re]) => re.test(e.constraint ?? ""));
      return hit ? { kind: "failed", field: hit[1], message: hit[2] } : { kind: "failed", message: "این مقدار تکراری است." };
    }
    case "23514":
      return { kind: "failed", message: "یکی از مقدارها مجاز نیست. فیلدها را بررسی کنید." };
    default:
      return null;
  }
}
