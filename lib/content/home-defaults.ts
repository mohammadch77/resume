/**
 * The page's own copy: what `home_content` holds when the row has not been written yet (a fresh database, the dev preview) and what
 * `scripts/seed-home.ts` writes into it. It is copy, not claims: no number, client, rating or year that could be untrue.
 * Every key has the length limit of its column (drizzle/migrations/0007); tests/unit/home-defaults.test.ts keeps them in step.
 */
export type HomeTexts = {
  heroEyebrow: string;
  heroLine1: string;
  heroLine2: string;
  heroLine3: string;
  heroDescription: string;
  heroSecondaryCtaLabel: string;
  aboutEyebrow: string;
  aboutLead: string;
  aboutRest: string;
  workEyebrow: string;
  workTitle: string;
  servicesEyebrow: string;
  servicesTitle: string;
  statsEyebrow: string;
  statsTitle: string;
  bandTitle: string;
  bandText: string;
  footerTagline: string;
  footerLegal: string;
};

export const HOME_TEXT_DEFAULTS: HomeTexts = {
  heroEyebrow: "استودیوی طراحی و توسعه",
  heroLine1: "سایت و نرم‌افزاری",
  heroLine2: "که کسب‌وکارتان را",
  heroLine3: "جلو می‌برد",
  heroDescription: "برای صاحبان کسب‌وکار که سایت یا نرم‌افزار سفارشی می‌خواهند: از ایده تا انتشار، با تیمی که پاسخ‌گوست.",
  heroSecondaryCtaLabel: "نمونه‌کارها",
  aboutEyebrow: "درباره‌ی ما",
  aboutLead: "با تیم‌های جاه‌طلب همکاری می‌کنیم تا محصول دیجیتال بسازند، ",
  aboutRest: "از طراحی و توسعه تا راهبردی که این دو را کنار هم نگه می‌دارد.",
  workEyebrow: "نمونه‌کارها",
  workTitle: "کارهای منتخب",
  servicesEyebrow: "خدمات",
  servicesTitle: "کارهایی که بهتر انجام می‌دهیم",
  statsEyebrow: "در یک نگاه",
  statsTitle: "اثر کار را در نتیجه ببینید، نه در حرف.",
  bandTitle: "پروژه‌تان را برایمان تعریف کنید",
  bandText: "چند خط درباره‌ی هدفتان بنویسید؛ پس از بررسی با شما تماس می‌گیریم.",
  footerTagline: "استودیوی مستقل طراحی و توسعه‌ی سایت و نرم‌افزار.",
  footerLegal: "همه‌ی حقوق محفوظ است.",
};
