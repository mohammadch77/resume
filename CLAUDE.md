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
- At most **one** WebGL/canvas effect on the whole page, only in the hero, mounted lazily, paused offscreen (IntersectionObserver), disabled when `prefers-reduced-motion`, `saveData`, or `navigator.hardwareConcurrency <= 4` / `deviceMemory <= 4`. Prefer CSS/SVG backgrounds. Heavy React Bits backgrounds (Ballpit-class) are forbidden.
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
Section order (single page, anchor nav): Hero (outcome-led headline for the visitor, one CTA, proof strip) -> Selected Work (the star; featured projects first) -> Services (from the database) + CTA band -> Results (only real metrics from `project_metrics`) -> Testimonials (only with consent) -> Clients -> Footer. There is **no contact section** on the page. The contact form opens only from the CTA: the primary label is a **button three times** (Navbar, Hero, the services CTA band) and a **plain link** in the footer (never a button; its href comes from `site_settings.consult_cta_href`: `tel:`, `https://` or `#anchor`, and the contact form while empty). Every CTA that leads to the form is a real link to `/contact`; with JavaScript a click opens the same form in a drop-in dialog (design-system `Dialog`, transform + opacity, focus trap, Escape, reduced motion) over the landing, without JavaScript it navigates to `/contact`, a page of its own (`noindex`, not in the sitemap). Dialog and page are one form with one result (a lead, the same Persian messages). There is no "How we work" section.
- Never fabricate numbers, logos, clients or testimonials. Seed/demo content must be visibly labelled "نمونه" and must be impossible to publish without being replaced (seed rows are `draft`).
- Case studies open as an accessible modal with deep link (`/#work/<slug>`), plus a static route `/work/<slug>` for SEO/share (Phase 2 if time is short).
- Hero must show a clear value proposition, who it's for, and the CTA within the first viewport on a 360px phone.
- Forms: 3 fields visible (name, phone, message), email/company optional. Button text states the outcome ("درخواست مشاوره رایگان"), not "ارسال".
- Accessibility: contrast AA, visible focus, keyboard navigable modal with focus trap, `prefers-reduced-motion` respected, RTL-correct reading order, `lang="fa" dir="rtl"`.
- SEO: server-rendered content, `Organization` + `CreativeWork` JSON-LD from DB, sitemap, robots, canonical, OG image.

## 7. Visual design direction — the Grin Web Design System is the source of truth
The design system lives in `/design` (exported from Claude Design: `design/Grin_Web_Design_System.zip` unpacked). Do NOT invent colors, fonts, radii, shadows or components. Read `design/README.md`, `design/SKILL.md`, `design/guidelines/layout.md`, `design/guidelines/motion.md`, `design/tokens/*`, `design/components/*/*.prompt.md` and `design/ui_kits/landing/` (reference composition, visual reference only) before any UI work.
- Concept: a printed project dossier. Persian-first, `dir="rtl"`, logical CSS properties only, Persian digits, borders not shadows, one lapis accent, saffron once per area, crop marks only around project covers, no invented proof (demo copy labelled «نمونه»).
- Tokens: `design/tokens/*.css` + `tokens.json` are authoritative; map them to Tailwind v4 `@theme` (generated, never hand-copied). Light + dark themes via `[data-theme]`.
- Fonts: self-hosted from `design/fonts` (Estedad ExtraBold, Vazirmatn UI FD Regular/SemiBold; OFL). Preload only Regular + ExtraBold.
- Components: the DS components (Button, Chip, Field, Icon, Metric, Modal, Navbar, ProjectCard, CropFrame, CoverArt, Testimonial from the export, plus ServiceCard/ServiceGrid and CtaBand that we added, see `design/decisions.md`) are ported 1:1 to typed React in `components/ds` (same markup, `gw-*` classes, props from the `.d.ts`). The public site is composed ONLY from them plus layout classes. Admin uses shadcn but must use the same tokens.
- Icons: Lucide (1.5px stroke) via the `lucide-react` package, tree-shaken. The DS Icon fetches from a CDN; do not do that in production.
- **Spend boldness in one place:** the portfolio section as a pinned horizontal project strip (GSAP ScrollTrigger + Lenis, RTL-aware), real covers. Everything else quiet and typographic.
- Motion: follow `design/guidelines/motion.md`. One hero entrance (once), the strip, hover/modal. Nothing else moves on its own. Below 768px or with reduced motion the strip is a normal list.
- Adherence: `design/_adherence.oxlintrc.json` rules (no raw hex, import from the DS index) are enforced in lint.

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
/components/ds          typed React port of the design-system components
/design                 exported design system (read-only source of truth) + decisions.md
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
