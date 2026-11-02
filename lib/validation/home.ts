import { z } from "zod";
import { normalizeDigits } from "@/lib/date/jalali-input";
import { HOME_TEXT_DEFAULTS, type HomeTexts } from "@/lib/content/home-defaults";
import { isSampleText } from "@/lib/content/sample";
import { optionalText, requiredText, optionalUuid } from "./common";

/** Column limits of drizzle/migrations/0007_home_content.sql (char_length BETWEEN 1 AND n). The database CHECKs stay the last line; tests/db/home-admin.test.ts proves both agree. */
export const HOME_TEXT_LIMITS: Record<keyof HomeTexts, number> = {
  heroEyebrow: 60,
  heroLine1: 60,
  heroLine2: 60,
  heroLine3: 60,
  heroDescription: 300,
  heroSecondaryCtaLabel: 40,
  aboutEyebrow: 60,
  aboutLead: 200,
  aboutRest: 300,
  workEyebrow: 60,
  workTitle: 80,
  servicesEyebrow: 60,
  servicesTitle: 80,
  statsEyebrow: 60,
  statsTitle: 80,
  bandTitle: 120,
  bandText: 300,
  footerTagline: 200,
  footerLegal: 120,
};

/** The Persian name of every text field (error messages and the admin labels). */
export const HOME_TEXT_LABELS: Record<keyof HomeTexts, string> = {
  heroEyebrow: "برچسب بالای تیتر",
  heroLine1: "تیتر، خط اول",
  heroLine2: "تیتر، خط دوم",
  heroLine3: "تیتر، خط سوم",
  heroDescription: "توضیح زیر تیتر",
  heroSecondaryCtaLabel: "متن دکمه‌ی دوم (نمونه‌کارها)",
  aboutEyebrow: "برچسب بخش درباره",
  aboutLead: "درباره: جمله‌ی پررنگ",
  aboutRest: "درباره: ادامه‌ی متن",
  workEyebrow: "برچسب بخش نمونه‌کارها",
  workTitle: "عنوان بخش نمونه‌کارها",
  servicesEyebrow: "برچسب بخش خدمات",
  servicesTitle: "عنوان بخش خدمات",
  statsEyebrow: "برچسب بخش آمار",
  statsTitle: "عنوان بخش آمار",
  bandTitle: "بنر: عنوان",
  bandText: "بنر: متن",
  footerTagline: "فوتر: توضیح کوتاه",
  footerLegal: "فوتر: متن حقوقی",
};

const textShape = Object.fromEntries(
  (Object.keys(HOME_TEXT_LIMITS) as Array<keyof HomeTexts>).map((k) => [k, requiredText(HOME_TEXT_LABELS[k], HOME_TEXT_LIMITS[k])]),
) as Record<keyof HomeTexts, ReturnType<typeof requiredText>>;

const optional60 = (label: string) => optionalText(label, 60);

/**
 * The singleton form. Optional pieces use "" for "empty" (like the other admin forms); the rating is score and label together or neither
 * (CHECK home_content_rating_together), the two hero pictures both or neither (home_content_hero_images_together).
 */
export const homeFormSchema = z
  .object({
    ...textShape,
    heroImageBaseId: optionalUuid,
    heroImageHoverId: optionalUuid,
    heroRatingScore: z
      .string()
      .trim()
      .transform(normalizeDigits)
      .refine((v) => v === "" || /^[1-5]$/.test(v), "امتیاز باید عددی از ۱ تا ۵ باشد."),
    heroRatingLabel: optional60("متن امتیاز"),
    statusLeft: optional60("نوار وضعیت، سمت راست"),
    statusCenter: optional60("نوار وضعیت، وسط"),
    statusRight: optional60("نوار وضعیت، سمت چپ"),
  })
  .superRefine((v, ctx) => {
    if ((v.heroImageBaseId === "") !== (v.heroImageHoverId === "")) {
      ctx.addIssue({ code: "custom", path: [v.heroImageBaseId === "" ? "heroImageBaseId" : "heroImageHoverId"], message: "هر دو تصویر هیرو را انتخاب کنید یا هیچ‌کدام را." });
    }
    if (v.heroImageBaseId !== "" && v.heroImageBaseId === v.heroImageHoverId) {
      ctx.addIssue({ code: "custom", path: ["heroImageHoverId"], message: "دو تصویر باید متفاوت باشند." });
    }
    if ((v.heroRatingScore === "") !== (v.heroRatingLabel === "")) {
      ctx.addIssue({ code: "custom", path: [v.heroRatingScore === "" ? "heroRatingScore" : "heroRatingLabel"], message: "امتیاز و متن آن را با هم بنویسید یا هر دو را خالی بگذارید." });
    }
  });

export type HomeFormValues = z.infer<typeof homeFormSchema>;

export const HOME_FORM_BLANK: HomeFormValues = {
  ...HOME_TEXT_DEFAULTS,
  heroImageBaseId: "",
  heroImageHoverId: "",
  heroRatingScore: "",
  heroRatingLabel: "",
  statusLeft: "",
  statusCenter: "",
  statusRight: "",
};

/** The pictures that can carry transparency (the database trigger gw_hero_images_guard allows exactly these). */
export const HOME_IMAGE_MIMES = ["image/png", "image/webp", "image/avif"] as const;

export const MAX_HERO_CARDS = 5;
export const MAX_HOME_STATS = 4;

export const heroCardSchema = z.object({
  caption: requiredText("برچسب کارت", 40),
  title: requiredText("عنوان کارت", 80),
});
export type HeroCardValues = z.infer<typeof heroCardSchema>;

export const homeStatSchema = z.object({
  value: z
    .string()
    .trim()
    .transform(normalizeDigits)
    .refine((v) => /^\d{1,6}$/.test(v), "عدد را بین ۰ تا ۹۹۹٬۹۹۹ بنویسید."),
  suffix: z.string().trim().max(4, "پسوند حداکثر ۴ حرف باشد؛ مثال: + یا ٪"),
  label: requiredText("عنوان آمار", 60),
});
export type HomeStatValues = z.infer<typeof homeStatSchema>;

/** A «نمونه» text can be saved as a draft but never published (CHECK *_no_sample_published; the app says why first). */
export const hasSampleText = (...texts: string[]) => texts.some(isSampleText);
