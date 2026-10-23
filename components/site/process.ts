/**
 * The four "how we work" steps. This copy is generic (no numbers, clients or claims), so it is not proof; it still
 * belongs in the database next to the other editable copy. Tracked in docs/BACKLOG.md; until then it lives here.
 */
export const PROCESS_STEPS = [
  { title: "گفت‌وگوی اولیه", text: "مسئله، مخاطب و محدودیت‌ها را با هم دقیق می‌کنیم." },
  { title: "پیشنهاد و زمان‌بندی", text: "دامنه‌ی کار، هزینه و مراحل تحویل را مکتوب می‌دهیم." },
  { title: "طراحی و ساخت", text: "در دوره‌های کوتاه می‌سازیم و هر مرحله را با شما مرور می‌کنیم." },
  { title: "انتشار و پشتیبانی", text: "سایت را منتشر می‌کنیم و پس از آن کنارتان می‌مانیم." },
] as const;

/** Used only before the first save of the site settings (a fresh database has no settings row). */
export const FALLBACK_SETTINGS = {
  brandName: "Grin Web",
  heroTitle: "سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد",
  primaryCtaLabel: "درخواست مشاوره رایگان",
} as const;
