import { z } from "zod";
import { normalizeDigits } from "@/lib/date/jalali-input";
import { optionalHttpsUrl, optionalText, requiredText } from "./common";

/** The only social networks the database accepts (CHECK `gw_socials_valid`), with their Persian names. */
export const SOCIAL_NETWORKS = {
  telegram: "تلگرام",
  bale: "بله",
  eitaa: "ایتا",
  instagram: "اینستاگرام",
  linkedin: "لینکدین",
  github: "گیت‌هاب",
  aparat: "آپارات",
  x: "ایکس",
  whatsapp: "واتس‌اپ",
} as const;

export type SocialKey = keyof typeof SOCIAL_NETWORKS;
export const SOCIAL_KEYS = Object.keys(SOCIAL_NETWORKS) as SocialKey[];

const phone = z
  .string()
  .trim()
  .transform(normalizeDigits)
  .refine((v) => v === "" || /^0\d{10}$/.test(v), "شماره باید ۱۱ رقم و با صفر شروع شود؛ مثال: ۰۲۱۱۲۳۴۵۶۷۸ یا ۰۹۱۲۱۲۳۴۵۶۷");

/** Same shape as CHECK `site_settings_consult_href_format` (migration 0006). */
export const CONSULT_HREF_PATTERN = /^(tel:\+?[0-9]{5,15}|https:\/\/[^\s<>"]+|#[A-Za-z0-9_-]+)$/;

const consultHref = z
  .string()
  .trim()
  .transform(normalizeDigits)
  .refine((v) => v.length <= 200, "لینک خیلی طولانی است.")
  .refine((v) => v === "" || CONSULT_HREF_PATTERN.test(v), "لینک باید با tel: یا https:// شروع شود یا یک # باشد؛ مثال: tel:+98912xxxxxxx");

const email = z
  .string()
  .trim()
  .max(254, "ایمیل خیلی طولانی است.")
  .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "ایمیل را درست بنویسید؛ مثال: info@example.com");

/** Shared by the settings form and saveSettingsAction. Mirrors the CHECKs on `site_settings`; "" means "not shown". */
export const settingsFormSchema = z.object({
  brandName: requiredText("نام برند", 60),
  heroTitle: requiredText("تیتر صفحه‌ی اصلی", 120),
  heroSubtitle: requiredText("زیرتیتر صفحه‌ی اصلی", 300),
  primaryCtaLabel: requiredText("متن دکمه‌ی اصلی", 40),
  contactPhone: phone,
  contactEmail: email,
  contactAddress: optionalText("نشانی", 300),
  consultCtaHref: consultHref,
  socials: z.object(Object.fromEntries(SOCIAL_KEYS.map((k) => [k, optionalHttpsUrl(SOCIAL_NETWORKS[k])])) as Record<SocialKey, ReturnType<typeof optionalHttpsUrl>>),
  seoTitle: optionalText("عنوان سئو", 70),
  seoDescription: optionalText("توضیح سئو", 160),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
