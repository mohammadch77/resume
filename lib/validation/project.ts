import { z } from "zod";
import { parseJalaliInput } from "@/lib/date/jalali-input";
import { optionalHttpsUrl, optionalText, optionalUuid, requiredText, slugSchema } from "./common";

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
