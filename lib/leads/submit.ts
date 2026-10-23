import { z } from "zod";
import { isAllowedOrigin } from "@/lib/auth/request";
import { normalizeDigits } from "@/lib/date/jalali-input";
import type { Db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import type { ContactField, ContactState } from "./state";

/** Shortest time a person needs to read and fill three fields; faster than this is a script. */
export const MIN_FILL_MS = 3_000;
/** A form older than this was left open (or its timestamp was forged); the check is skipped, the rest still applies. */
export const MAX_FILL_AGE_MS = 6 * 60 * 60 * 1000;
export const CONTACT_LIMITS = { perIp: { max: 5, windowMs: 10 * 60_000 }, global: { max: 120, windowMs: 10 * 60_000 } } as const;

export { IDLE, type ContactField, type ContactState } from "./state";

/** 09121234567, ۰۹۱۲۱۲۳۴۵۶۷, +98 912 123 4567, 0098-912-..., 9121234567 -> 09121234567; anything else -> input unchanged. */
export function normalizePhone(raw: string): string {
  const digits = normalizeDigits(raw).replace(/[\s\-()]/g, "");
  const m = /^(?:\+98|0098|98)?0?(9\d{9})$/.exec(digits);
  return m ? `0${m[1]}` : digits;
}

/** Mirrors the CHECKs on `leads`; the messages say how to fix the field (design system voice). */
export const contactSchema = z.object({
  name: z.string().trim().min(1, "نام خود را بنویسید.").max(80, "نام حداکثر ۸۰ حرف باشد.").refine((v) => !/[<>]/.test(v), "نام نباید < یا > داشته باشد."),
  phone: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((v) => /^09\d{9}$/.test(v), "شماره را با ۰۹ شروع کنید و ۱۱ رقم بنویسید."),
  message: z.string().trim().min(1, "درباره‌ی پروژه‌تان چند خط بنویسید.").max(2000, "پیام حداکثر ۲۰۰۰ حرف باشد.").refine((v) => !/[<>]/.test(v), "پیام نباید < یا > داشته باشد."),
});

export type ContactDeps = {
  db: Db;
  now: number;
  origin: string | null;
  siteOrigin: string;
  /** sha256(ip + daily salt), or null when the client address is not trusted (no proxy). */
  ipHash: string | null;
  /** Records an attempt for this key and says whether it is still within its limit. */
  allow: (key: string, limit: { max: number; windowMs: number }) => boolean;
  /** Fire-and-forget notification (Telegram/Bale); never awaited by the visitor's request. */
  notify?: (lead: { name: string; phone: string; message: string }) => void;
};

const BAD_REQUEST = "درخواست نامعتبر است. صفحه را دوباره بارگذاری کنید.";
const TOO_FAST = "فرم را کمی آرام‌تر پر کنید؛ چند ثانیه بعد دوباره ارسال کنید.";
const TOO_MANY = "درخواست‌های زیادی ثبت شده است. چند دقیقه بعد دوباره تلاش کنید.";
const FAILED = "ثبت درخواست انجام نشد. چند دقیقه بعد دوباره تلاش کنید یا تماس بگیرید.";

const text = (raw: Record<string, unknown>, key: string): string => (typeof raw[key] === "string" ? (raw[key] as string) : "");

/**
 * The whole contact-form decision, in order: Origin -> honeypot -> fill time -> rate limit -> validation -> insert.
 * Pure of Next.js so it can be tested; the "use server" file only supplies the request's facts.
 */
export async function submitContact(deps: ContactDeps, raw: Record<string, unknown>): Promise<ContactState> {
  const values = { name: text(raw, "name"), phone: text(raw, "phone"), message: text(raw, "message") };

  if (!isAllowedOrigin(deps.origin, deps.siteOrigin)) return { status: "error", message: BAD_REQUEST, values };

  // A filled honeypot is a bot. Answer as if it worked: it learns nothing, and nothing is stored.
  if (text(raw, "website").trim() !== "") return { status: "sent" };

  const startedAt = Number(text(raw, "ts"));
  if (Number.isFinite(startedAt) && startedAt > 0) {
    const elapsed = deps.now - startedAt;
    if (elapsed >= 0 && elapsed < MIN_FILL_MS) return { status: "error", message: TOO_FAST, values };
  }

  if ((deps.ipHash && !deps.allow(`ip:${deps.ipHash}`, CONTACT_LIMITS.perIp)) || !deps.allow("global", CONTACT_LIMITS.global)) {
    return { status: "error", message: TOO_MANY, values };
  }

  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ContactField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ContactField;
      fieldErrors[field] ??= issue.message;
    }
    return { status: "error", fieldErrors, values };
  }

  try {
    await deps.db.insert(leads).values({ ...parsed.data, consent: true, source: "landing", ipHash: deps.ipHash });
  } catch (err) {
    console.error("contact form: could not store the lead", err instanceof Error ? err.message : err);
    return { status: "error", message: FAILED, values };
  }
  deps.notify?.(parsed.data);
  return { status: "sent" };
}
