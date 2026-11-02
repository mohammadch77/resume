# CLAUDE.md — Portfolio Landing + Admin (single-page company site)

Read this file fully before any task. It is the source of truth for architecture, rules and acceptance criteria.
If a prompt conflicts with this file, stop and ask. Never silently deviate.

## 1. What we are building

A Persian (fa, RTL) single-page corporate landing whose main job is to **showcase our portfolio** and convert visitors into leads.
All content (projects, clients, services, testimonials, hero copy, contact info) is managed from an **admin panel** on the same server.

- Brand name, copy and contact info live in DB (`site_settings`), never hard-coded. Default brand placeholder: "Grin Web" (assumption — configurable).
- Primary conversion: contact/consultation request form -> `leads` table (+ optional Telegram/Bale notification).
- Deployed by us on our own VPS (Iran-hosted assumption). **Nothing may depend on a foreign CDN, Google Fonts, Vercel-only features, or any external runtime service.** Everything self-hosted.

## 2. Stack (decided; do not swap without asking)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router), `output: "standalone"`, React Server Components | Landing is static HTML (ISR) -> fastest TTFB/LCP; same codebase for admin; React Bits is React. |
| Language | TypeScript strict | Types end-to-end, mirrors strict DB. |
| Styling | Tailwind CSS + shadcn/ui (admin) | React Bits ships Tailwind variants; no runtime CSS-in-JS. |
| Animation | GSAP (+ ScrollTrigger, SplitText, `@gsap/react`), Lenis, React Bits (TS-TW variants, copied as source) | Requested. All lazy-loaded, public landing only. |
| DB | PostgreSQL (latest stable supported by the server) | Real constraints, triggers, partial indexes, jsonb, citext. |
| Data access | Drizzle ORM + hand-written SQL migrations | SQL-first: CHECKs/triggers/roles live in migrations, not hidden by an ORM. |
| Validation | Zod at every boundary (forms, server actions, env) | DB constraints are the last line, not the first. |
| Auth | Own DB-backed sessions: argon2id, httpOnly+Secure+SameSite=Lax cookie, rotating session id, no JWT | Simple, revocable, auditable. |
| Images | `sharp` at upload -> AVIF + WebP + fallback at fixed widths; metadata in DB | No on-the-fly optimizer; Nginx serves static files directly. |
| Runtime | Docker Compose: `app` (Node LTS), `postgres`, `nginx` | Reproducible deploy on our server. |
| Tests | Vitest (unit), real-Postgres constraint tests, Playwright (e2e), Lighthouse CI (budgets) | Strictness is proven, not claimed. |

Always install the **latest stable** versions; verify with `npm view <pkg> version` and read the package README before using an API. Do not rely on memory of APIs for Next.js, Drizzle, GSAP, Lenis, React Bits.

Libraries to install (requested by the owner):
- React Bits (MIT + Commons Clause, free for commercial use; copy components as source): `npx shadcn@latest add @react-bits/<Name>-TS-TW` with registry `"@react-bits": "https://reactbits.dev/r/{name}.json"` in `components.json`.
- Lenis: `npm i lenis` (use `lenis/react` only if it reduces code; core is enough).
- GSAP (now free incl. plugins): `npm i gsap @gsap/react`. Register ScrollTrigger/SplitText explicitly.
- Lenis + GSAP sync: `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t*1000))`, `gsap.ticker.lagSmoothing(0)`; do NOT also enable `autoRaf` then.

## 3. Performance budget (hard gates, enforced by Lighthouse CI)

Mobile profile, throttled: LCP <= 1.8s, CLS <= 0.02, INP <= 200ms, TBT <= 150ms, Performance score >= 95.
- Initial JS on first paint <= 160 KB gzip (was 120; the Next + React framework floor alone is ~135 KB, measured in Phase 5b; owner decision). Lighthouse CI hard-fails only on CLS <= 0.02 and Accessibility = 1; the speed gates above (Performance, LCP, TBT) are warnings until Phase 8, where they must pass as errors on the real server (Nginx, HTTP/2, brotli). GSAP, ScrollTrigger, SplitText, Lenis are **dynamically imported after first paint** (`requestIdleCallback` fallback `setTimeout`). The hero must look complete without them (CSS-only initial state, no layout shift when they load).
- Admin code is a separate route group; GSAP/Lenis/React Bits never enter its bundle.
- At most **one** WebGL/canvas effect on the whole page, only in the hero, mounted lazily, paused offscreen (IntersectionObserver), disabled when `prefers-reduced-motion`, `saveData === true`, or a *reported* `deviceMemory <= 2` (undefined is not a reason; Firefox and Safari do not report it). The old `hardwareConcurrency <= 4` / `deviceMemory <= 4` rule is for heavy WebGL effects only: Firefox reports 4 cores on ordinary laptops, and the hero trail is a light 2D canvas, so it is guarded at run time instead (`lib/motion/frame-guard.ts`: if the first 2 s of drawing average over 30 ms a frame, it stops and removes the canvas). Prefer CSS/SVG backgrounds. Heavy React Bits backgrounds (Ballpit-class) are forbidden.
- Animate only `transform` and `opacity`. No animating layout properties. Use `will-change` sparingly and remove after animation.
- Lenis: desktop wheel smoothing only; `syncTouch: false`; `respectReducedMotion` left on; `anchors: true`; destroy on unmount.
- Fonts: self-hosted WOFF2, subset (Persian + Latin + digits), `font-display: swap`, preload the one critical weight. Max 2 families.
- Images: `width/height` always set from DB, `loading="lazy"` except LCP image (`fetchpriority="high"`), AVIF/WebP via `<picture>`, dominant-color placeholder.
- HTML is served from ISR cache; admin publish/unpublish calls `revalidateTag`. Nginx: brotli/gzip, `Cache-Control: public, max-age=31536000, immutable` for `/_next/static` and `/uploads`.

## 4. Database rules (Arshaman-grade strictness)

Principle: **the database must refuse bad data even if the app has a bug.**
- Two DB roles: `migrator` (DDL, used only by migration job) and `app_rw` (DML only; no DDL, no superuser, no `TRUNCATE`). App connects as `app_rw`.
- Every column `NOT NULL` unless NULL has a documented meaning. `timestamptz` everywhere (UTC). Money is not stored here.
- PKs: `uuid` (default `gen_random_uuid()`), except `audit_log` (`bigint generated always as identity`).
- FKs always explicit, `ON DELETE RESTRICT` (CASCADE only on pure join tables and `sessions`). Index every FK.
- Enums for closed sets (`user_role`, `content_status`, `lead_status`, `media_kind`). CHECKs for lengths, formats (slug regex `^[a-z0-9]+(-[a-z0-9]+)*$`), URLs (`^https://`), hex colors, positive numbers.
- Emails are `citext`. Phone numbers stored normalized (`09\d{9}`); at least one of phone/email on a lead.
- Soft delete (`deleted_at`) for content tables; uniqueness via **partial unique indexes** `WHERE deleted_at IS NULL`. Hard delete is only for `sessions` and leads past retention.
- `updated_at` maintained by trigger; `version int` on `projects`, `site_settings`, `services`, `testimonials` for optimistic locking (update must include expected version; 0 rows updated = conflict error shown to admin).
- **State machine** for `content_status` enforced by trigger: `draft -> published -> archived`, `archived -> draft`, `published -> draft`. Illegal transitions raise an exception.
- **Publish gate** (CHECK/trigger): a project can be `published` only if it has `cover_media_id`, `published_at`, summary length 20..280, at least one `project_services` row. A testimonial can be published only if `consent_confirmed = true`.
- **Audit trail**: trigger on every content table writes `audit_log` (table, row id, action, before/after jsonb, actor from `SET LOCAL app.user_id`, request id). `audit_log` is append-only: triggers reject UPDATE/DELETE, `app_rw` has INSERT/SELECT only.
- Ordering: `position`/`sort_order` unique per parent via `UNIQUE ... DEFERRABLE INITIALLY DEFERRED` so reorders are atomic in one transaction.
- Raw IPs are never stored; store `sha256(ip + daily_salt)`.
- Every constraint above must have a test that proves the violating statement is rejected (see section 9).

### Tables (names fixed; columns indicative — finalize in the schema phase)
- `users` (email citext unique, password_hash, display_name, role, is_active, failed_logins, locked_until, last_login_at, deleted_at)
- `sessions` (id = sha256 of token, user_id, expires_at, ip_hash, user_agent, created_at)
- `media_assets` (kind, mime allowlist CHECK, bytes CHECK 0 < bytes <= limit, width, height, alt_fa, dominant_color, sha256 UNIQUE, original_path, variants jsonb, uploaded_by)
- `industries`, `tech_tags`, `services` (slug, title, summary, icon_key, sort_order, status)
- `clients` (name, slug, industry_id, logo_media_id, website_url, show_name_publicly)
- `projects` (slug, title, client_id, industry_id, summary, challenge, solution, outcome, completed_on date, live_url, cover_media_id, is_featured, sort_order, status, published_at, seo_title, seo_description, version, deleted_at)
- `project_services`, `project_tech` (composite-PK join tables), `project_media` (position, caption, unique (project_id, position) deferrable), `project_metrics` (label, value_text, position — real data only)
- `testimonials` (client_id, project_id nullable, author_name, author_role, quote, consent_confirmed, status, version)
- `leads` (name, phone, email, company, message, budget_range, source, status, consent true CHECK, ip_hash, handled_by, internal_notes)
- `site_settings` (singleton: `id smallint PRIMARY KEY CHECK (id = 1)`; brand_name, hero_title, hero_subtitle, primary_cta_label, contact fields, socials jsonb with CHECK on shape, default SEO, version)
- `audit_log`

Dates: store Gregorian; display Shamsi with built-in `Intl.DateTimeFormat('fa-IR-u-ca-persian')`, zone `Asia/Tehran`. No date library unless needed.

## 5. Security rules
- Argon2id; login rate limit (Nginx `limit_req` + `failed_logins`/`locked_until`); constant-time compare; generic login errors.
- CSRF: server actions + `Origin` check; all mutations via server actions/route handlers behind `requireRole()`.
- Strict CSP (nonce-based), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (at Nginx). `/admin` has `noindex` + `X-Robots-Tag`.
- Upload safety: size caps, MIME sniffing (magic bytes, not extension), re-encode through `sharp` (strips EXIF/GPS), random filenames, files outside app dir served by Nginx, never executable.
- Public contact form: Zod, honeypot field, minimum fill-time, per-IP-hash rate limit, no HTML in stored text, output always escaped.
- Secrets only via env, validated by Zod at boot (app refuses to start if invalid). `.env` never committed.
- Dependencies: `npm audit` in CI, lockfile committed, no postinstall scripts from unknown packages.

## 6. Landing page (CRO rules — conversion first, beauty second)
Section order (single page, anchor nav): Hero (outcome-led headline for the visitor, one CTA, proof strip) -> Selected Work (the star; featured projects first, a two-column grid of cards) -> Services (from the database) + CTA band -> Stats panel (up to four figures the owner enters in the admin; a figure is published only with a real value, never a «نمونه» one, and with none published the section is absent; `project_metrics` appear only on each case study) -> Testimonials (only with consent) -> Clients -> Footer. There is **no contact section** on the page. The contact form opens only from the CTA: the primary label is a **button three times** (Navbar, Hero, the services CTA band) and a **plain link** in the footer (never a button; its href comes from `site_settings.consult_cta_href`: `tel:`, `https://` or `#anchor`, and the contact form while empty). Every CTA that leads to the form is a real link to `/contact`; with JavaScript a click opens the same form in a drop-in dialog (the kit's `PageDialog`, transform + opacity, focus trap, Escape, reduced motion) over the landing, without JavaScript it navigates to `/contact`, a page of its own (`noindex`, not in the sitemap). Dialog and page are one form with one result (a lead, the same Persian messages). There is no "How we work" section.
- Never fabricate numbers, logos, clients or testimonials. Seed/demo content must be visibly labelled "نمونه" and must be impossible to publish without being replaced (seed rows are `draft`).
- Case studies open as an accessible modal with deep link (`/#work/<slug>`), plus a static route `/work/<slug>` for SEO/share (Phase 2 if time is short).
- Hero must show a clear value proposition, who it's for, and the CTA within the first viewport on a 360px phone.
- Forms: 3 fields visible (name, phone, message), email/company optional. Button text states the outcome ("درخواست مشاوره رایگان"), not "ارسال".
- Accessibility: contrast AA, visible focus, keyboard navigable modal with focus trap, `prefers-reduced-motion` respected, RTL-correct reading order, `lang="fa" dir="rtl"`.
- SEO: server-rendered content, `Organization` + `CreativeWork` JSON-LD from DB, sitemap, robots, canonical, OG image.

## 7. Visual design direction — the Lumora reference + the two hero images are the source of truth (v2)
The look comes from `design/reference/lumora-prompt.md` (structure, layout, motion, effects) and the two hero images in `design/reference/hero/` (`hero-sketch.png` base, `hero-bold.png` revealed by the pointer; both alpha PNGs, same size and alignment, never realigned). The old Grin Web design system (lapis, saffron, crop marks, CropFrame/CoverArt, "borders not shadows", the old adherence lint) was **retired and deleted** (phase 5 of the v2 redesign: `components/ds`, the design export, its lint, dev pages and the LEGACY token block are gone) and must not be brought back. Do NOT invent colors, fonts, radii or components beyond the reference.
- Tokens: `design/tokens.json` is the only token source; `scripts/gen-tokens.ts` builds `app/tokens.css` and `app/theme.css` (Tailwind v4 `@theme`) from it, never hand-copied. Palette: white page, `#f1f0ee` surface, ink `#141414`, **one** accent `#ec3f1e`. The accent is 3.97:1 on white, so it is used only for fills with ink text on them (4.65:1), large display type, rings and decoration; small accent-coloured text uses `accent-ink`. `npm run design:contrast` checks every pair used (AA 4.5:1 text, 3:1 large text and non-text). No dark theme for now (admin included).
- Font: **Estedad** (OFL, self-hosted, official release; license in `public/fonts/OFL-Estedad.txt`), weights 400 and 600, subset, one family. Preload both faces (with only the 600 preloaded, the 400 swapped in after first paint, the hero lead lost a line and the monitor moved 34 px: CLS 0.018 of the 0.02 limit; with both preloaded CLS is 0). No letter-spacing on Persian text (it breaks joining), headings need a line-height of at least 1.3 (clipped line reveals), no uppercase.
- Scale: rem. On the landing only, the root size is `clamp(15px, calc(0.6rem + 0.45vw), 22px)` (`:root:has(.lm-root)`): browser zoom and the user's font-size setting both still scale it (WCAG 1.4.4). The admin keeps the browser default.
- Components: built from scratch in `components/site/ui` (PillButton, Eyebrow, TagChip, PortfolioCard, ServiceRow, StatsPanel, NavMenu, PageDialog) with `lm-*` classes; the page is composed only from them. Persian-first RTL: logical CSS properties, Persian digits, arrows mirrored, dates Shamsi in `Asia/Tehran`. The admin (shadcn) uses the same tokens.
- Icons: Lucide via `lucide-react`, tree-shaken, no CDN. No external CDN, font host or image host of any kind.
- Hero: one big monitor (no background) beside the text, text is real HTML from the database. The base image is the LCP (fixed width/height, `fetchpriority=high`, AVIF/WebP with alpha); the second image loads after the first pointer or idle and is revealed by one pointer-trail canvas (brush radius 143, decay 0.016, dpr <= 2) clipped to the monitor's silhouette; lazy, paused offscreen, off for reduced motion, `saveData === true`, a reported 2 GB device, touch and mobile; stopped by the frame guard on a machine that is really slow (static image). With no hero images the hero is complete typography.
- Motion: CSS/GSAP only, `transform` + `opacity` only, hover effects only where there is a hover. No full-screen blocking loader (it conflicts with the LCP budget). No pinned horizontal strip: Selected Work is a two-column grid of cards. Every effect is measured (`npm run motion:cost`, A/B) before it is kept.
- Lint: no raw hex or px values in `app/` and `components/` (`npm run tokens:check`).

## 8. Repo layout
```
/app                    Next.js routes
  (site)/               public landing (RSC, ISR)
  (admin)/admin/        admin panel (separate bundle, noindex)
/components/site        public components (+ /components/react-bits copied sources)
/components/admin       admin components (shadcn)
/lib/db                 drizzle schema, client, queries
/lib/auth               sessions, password, requireRole
/lib/media              upload + sharp pipeline
/lib/motion             lazy loaders for gsap/lenis, reduced-motion & capability gating
/drizzle/migrations     hand-written SQL (+ drizzle meta)
/tests                  unit, db, e2e
/deploy                 docker-compose.yml, nginx.conf, backup.sh, RUNBOOK.md
/components/site/ui     the v2 page kit (Lumora-derived)
/design                 tokens.json (the one token source), reference/ (Lumora prompt + hero images), decisions.md
/fonts-src              Estedad sources + OFL license (input of scripts/subset-fonts.py, which writes public/fonts)
```

## 9. Definition of done (every phase)
1. `npm run typecheck && npm run lint && npm test` pass.
2. New DB rules have a violating-statement test that fails the statement.
3. No `any`, no unexplained `// @ts-ignore`, no dead code, no TODO left without a tracked entry in `docs/BACKLOG.md`.
4. Lighthouse CI budget (section 3) still passes once the landing exists.
5. Phase ends with a short report: what was done, what was verified (commands + results), what was NOT done, and decisions that need the owner.
6. Small atomic git commits with clear messages. Never commit secrets.

## 10. Working agreement
- Plan first for anything touching DB/auth/deploy: show the plan, wait for approval.
- If a requirement is ambiguous and the answer changes the design, ask once, in one batch. Otherwise decide, state the assumption, continue.
- Prefer boring, small, maintainable solutions. Say "this should not be built" when true.
- When an API is unfamiliar, read the installed package's docs/types first; never guess.

## 11. هزینه‌ی اجرا (صرفه‌جویی در توکن بدون افت کیفیت)
1. **تست به‌اندازه‌ی تغییر.** همیشه (ارزان): `typecheck`، `lint`، `tokens:check` و تست واحد مربوط. e2e: فقط اسپک‌های مربوط به فایل‌های تغییرکرده؛ اجرای کامل e2e فقط یک بار، درست قبل از کامیت پایان هر فاز؛ بعد از رفع یک شکست فقط همان اسپک (برای فلیکی تا ۳ بار)، نه کل مجموعه. تست DB: فقط فایل‌های مربوط به جدول/قاعده‌ی تغییرکرده؛ اجرای کامل DB فقط با مهاجرت جدید.
2. **اندازه‌گیری.** JS اولیه با اسکریپت اندازه‌ی باندل (ارزان)، نه lhci. `lhci` و `motion:cost` فقط وقتی تغییر روی هیرو/LCP، فونت، باندل یا حرکت اثر دارد، و یک بار در پایان فاز با میانه‌ی ۳ اجرا. بیلد production فقط برای lhci/e2e؛ برای بازبینی ظاهری dev.
3. **اسکرین‌شات** فقط از بخش‌های تغییرکرده در ۱۴۴۰ و ۳۹۰، نه کل صفحه برای هر اصلاح.
4. **شکست محیطی** (سرور تست مرد، رم کم): یک بار علتش را بگو و رفع کن؛ حلقه‌ی دوباره‌اجراکردن نساز.
5. **متن‌های میانی کوتاه؛ گزارش نهایی فشرده.**
چیزهایی که کم نمی‌شوند: قواعد DB و تست «عبارت نقض‌کننده رد می‌شود»، گیت‌های سخت (CLS ≤ ۰٫۰۲، a11y = ۱، سقف JS)، امنیت، بازبینی ظاهری قبل از گزارش.

