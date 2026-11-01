-- 0008: the one row of home_content, with the default copy of lib/content/home-defaults.ts and no pictures (both picture columns stay NULL).
-- It is the only data a migration writes, because the page and the admin both expect the singleton to exist: app_rw can UPDATE it but never INSERT it
-- (0007), so without this row a fresh database would have nothing to edit. Existing rows are left alone. tests/unit/migrations.test.ts keeps the
-- literals below equal to HOME_TEXT_DEFAULTS. Pictures, sample cards and figures stay in `npm run seed:home`.
INSERT INTO home_content (
  id, hero_eyebrow, hero_line1, hero_line2, hero_line3, hero_description, hero_secondary_cta_label,
  about_eyebrow, about_lead, about_rest, work_eyebrow, work_title, services_eyebrow, services_title,
  stats_eyebrow, stats_title, band_title, band_text, footer_tagline, footer_legal
) VALUES (
  1, 'استودیوی طراحی و توسعه', 'سایت و نرم‌افزاری', 'که کسب‌وکارتان را', 'جلو می‌برد', 'برای صاحبان کسب‌وکار که سایت یا نرم‌افزار سفارشی می‌خواهند: از ایده تا انتشار، با تیمی که پاسخ‌گوست.', 'نمونه‌کارها',
  'درباره‌ی ما', 'با تیم‌های جاه‌طلب همکاری می‌کنیم تا محصول دیجیتال بسازند، ', 'از طراحی و توسعه تا راهبردی که این دو را کنار هم نگه می‌دارد.', 'نمونه‌کارها', 'کارهای منتخب', 'خدمات', 'کارهایی که بهتر انجام می‌دهیم',
  'در یک نگاه', 'اثر کار را در نتیجه ببینید، نه در حرف.', 'پروژه‌تان را برایمان تعریف کنید', 'چند خط درباره‌ی هدفتان بنویسید؛ پس از بررسی با شما تماس می‌گیریم.', 'استودیوی مستقل طراحی و توسعه‌ی سایت و نرم‌افزار.', 'همه‌ی حقوق محفوظ است.'
) ON CONFLICT (id) DO NOTHING;
