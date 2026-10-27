import type { LandingData, LandingProject } from "@/lib/content/landing";

/**
 * Made-up content for /dev/landing-preview, so the layout of the landing (above all the Selected Work strip) can be looked at
 * without any database. It is a literal in code: it is never read from or written to the database, so it cannot be published.
 * Every title starts with «نمونه» and the covers are the design system's placeholder art, drawn with its «نمونه» label.
 * Only types are imported from lib/content/landing (tests/unit/architecture.test.ts keeps it that way).
 */
const project = (n: number, title: string, industry: string, tags: string[]): LandingProject => ({
  id: `preview-${n}`,
  slug: `preview-${n}`,
  title: `نمونه · ${title}`,
  summary: "نمونه: این کارت فقط برای دیدن چیدمان است و در هیچ‌جا ذخیره یا منتشر نمی‌شود.",
  challenge: "نمونه: شرح چالش.",
  solution: "نمونه: شرح راه‌حل.",
  outcome: "نمونه: شرح نتیجه.",
  completedOn: null,
  liveUrl: null,
  isFeatured: n <= 2,
  publishedAt: null,
  seoTitle: null,
  seoDescription: null,
  industry,
  tags: [industry, ...tags],
  serviceTitles: [],
  cover: null,
  gallery: [],
  metrics: [],
  clientName: null,
});

export const PREVIEW_DATA: LandingData = {
  settings: {
    brandName: "Grin Web",
    heroTitle: "سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد",
    heroSubtitle: "نمونه: پیش‌نمایش توسعه با داده‌ی ساختگی.",
    primaryCtaLabel: "درخواست مشاوره رایگان",
    contactPhone: null,
    contactEmail: null,
    contactAddress: null,
    consultCtaHref: null,
    socials: {},
    seoTitle: null,
    seoDescription: null,
  },
  projects: [
    project(1, "فروشگاه اینترنتی", "فروشگاه", ["Next.js"]),
    project(2, "سامانه‌ی نوبت‌دهی", "نرم‌افزار", ["React"]),
    project(3, "وب‌سایت شرکتی", "وب‌سایت", ["Tailwind"]),
    project(4, "داشبورد مدیریت", "نرم‌افزار", ["Laravel"]),
    project(5, "پورتال آموزشی", "وب‌سایت", ["Next.js"]),
  ],
  services: [
    { id: "s1", title: "نمونه · طراحی وب‌سایت", summary: "نمونه: توضیح کوتاه خدمت.", iconKey: "globe" },
    { id: "s2", title: "نمونه · طراحی اپلیکیشن", summary: "نمونه: توضیح کوتاه خدمت.", iconKey: "smartphone" },
    { id: "s3", title: "نمونه · طراحی UI/UX", summary: "نمونه: توضیح کوتاه خدمت.", iconKey: "palette" },
    { id: "s4", title: "نمونه · خدمات سئو", summary: "نمونه: توضیح کوتاه خدمت.", iconKey: "search" },
  ],
  testimonial: null,
  clientLogos: [],
};
