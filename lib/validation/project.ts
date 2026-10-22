import { z } from "zod";
import { isoDateToJalali, isValidJalali, jalaliToIsoDate } from "@/lib/date/jalali";
import { optionalHttpsUrl, optionalText, optionalUuid, requiredText, slugSchema } from "./common";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Persian / Arabic-Indic digits to ASCII, so a date typed on a Persian keyboard parses. */
export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (d) => String(Math.max(PERSIAN_DIGITS.indexOf(d), ARABIC_DIGITS.indexOf(d))));
}

/** "1404/05/12" (Persian digits and `-` accepted) to the ISO Gregorian date Postgres stores, or null when invalid. */
export function parseJalaliInput(value: string): string | null {
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(normalizeDigits(value.trim()));
  if (!m) return null;
  const date = { jy: Number(m[1]), jm: Number(m[2]), jd: Number(m[3]) };
  return isValidJalali(date) ? jalaliToIsoDate(date) : null;
}

/** ISO Gregorian date to the "1404/05/12" form the editor types; "" for no date. */
export function formatJalaliInput(iso: string | null): string {
  const j = iso ? isoDateToJalali(iso) : null;
  return j ? `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}` : "";
}

const completedOn = z
  .string()
  .trim()
  .refine((v) => v === "" || parseJalaliInput(v) !== null, "تاریخ شمسی را به شکل ۱۴۰۴/۰۵/۱۲ بنویسید.");

export const MAX_GALLERY = 30;
export const MAX_METRICS = 8;

/** Shared by the project form and saveProjectAction. Mirrors the CHECKs on `projects`, `project_media`, `project_metrics`. */
export const projectFormSchema = z.object({
  title: requiredText("عنوان", 120),
  slug: slugSchema,
  clientId: optionalUuid,
  industryId: z.uuid("حوزه‌ی کاری را انتخاب کنید."),
  summary: requiredText("خلاصه", 280),
  challenge: optionalText("چالش", 4000),
  solution: optionalText("راه‌حل", 4000),
  outcome: optionalText("نتیجه", 4000),
  completedOn,
  liveUrl: optionalHttpsUrl("نشانی پروژه"),
  coverMediaId: optionalUuid,
  isFeatured: z.boolean(),
  seoTitle: optionalText("عنوان سئو", 70),
  seoDescription: optionalText("توضیح سئو", 160),
  serviceIds: z.array(z.uuid()).max(12),
  techTagIds: z.array(z.uuid()).max(30),
  gallery: z
    .array(z.object({ mediaId: z.uuid(), caption: optionalText("شرح", 200) }))
    .max(MAX_GALLERY, `گالری حداکثر ${MAX_GALLERY.toLocaleString("fa-IR")} مورد دارد.`)
    .refine((items) => new Set(items.map((i) => i.mediaId)).size === items.length, "یک فایل را نمی‌توان دو بار در گالری گذاشت."),
  metrics: z
    .array(z.object({ label: requiredText("عنوان شاخص", 80), value: requiredText("مقدار شاخص", 40) }))
    .max(MAX_METRICS, `حداکثر ${MAX_METRICS.toLocaleString("fa-IR")} شاخص.`),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
