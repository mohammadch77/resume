# Claude Code prompts — run in order

Setup once: put `CLAUDE.md` in the repo root (Claude Code reads it automatically). Use one Claude Code session per phase, `/clear` between phases, commit after each phase.
Put `Grin_Web_Design_System.zip` (the export from Claude Design) in the repo root before Phase 0.
For Phases 1, 2 and 8 start in plan mode (Shift+Tab) and approve the plan before it edits files.

---

## Phase 0 — Bootstrap and install the three libraries

```
Read CLAUDE.md fully. Then bootstrap the project.

1. Create a Next.js (App Router, TypeScript strict, Tailwind, ESLint, src-less layout matching CLAUDE.md section 8) in the current directory. Use the latest stable versions; check with `npm view`.
2. Initialise shadcn/ui, set RTL-friendly defaults, and add the React Bits registry to components.json:
   "@react-bits": "https://reactbits.dev/r/{name}.json"
   Do not install any React Bits component yet.
3. Install: gsap, @gsap/react, lenis, zod, drizzle-orm, drizzle-kit, pg, sharp, argon2 (or @node-rs/argon2 if native build is a problem on Alpine — pick one and justify), vitest, @playwright/test, @lhci/cli.
4. Read the installed READMEs/types of gsap, lenis and the React Bits installation docs (https://reactbits.dev/get-started/installation) and write `docs/LIBS.md`: exact install/use snippets that apply to THIS project (Lenis+GSAP ticker sync, SplitText registration, the shadcn command for a React Bits TS-TW component, license notes). Only include what you verified from the installed packages.
5. Create `lib/env.ts` (Zod-validated env, app fails fast), `.env.example`, npm scripts: dev, build, start, typecheck, lint, test, test:db, test:e2e, lhci.
6. Configure next.config for `output: "standalone"`, strict security headers placeholder, and disable the built-in image optimizer (we pre-generate images).
7. Install `lucide-react`. Create `/design` and unpack the Grin Web Design System export there (I will place `Grin_Web_Design_System.zip` in the repo root; unzip to `/design`, keep it read-only, add it to .prettierignore). Copy `design/fonts/*.woff2` to `public/fonts`.
8. Create a minimal Dockerfile (multi-stage, non-root user) and `deploy/docker-compose.yml` with `app` and `postgres` (volume, healthcheck). Nginx comes in Phase 8.

Acceptance: `npm run build` succeeds, `docker compose up` boots app + postgres, `npm run typecheck && npm run lint` pass.
End with the report format from CLAUDE.md section 9.
```

---

## Phase 1 — Database (the strict part)

```
Plan first, wait for my approval, then implement.

Goal: implement the complete PostgreSQL schema described in CLAUDE.md section 4 with Drizzle for typing and hand-written SQL migrations for everything the ORM cannot express.

Deliver:
1. Migration 0001: extensions (pgcrypto/citext), enums, all tables, FKs (RESTRICT), indexes on every FK, partial unique indexes for slugs/emails with deleted_at IS NULL, all CHECK constraints (slug regex, https URLs, hex color, lengths, positive bytes, phone/email-or-phone on leads, consent = true on leads, site_settings singleton).
2. Migration 0002: triggers — updated_at, optimistic `version` increment, content_status state machine, publish gates (project + testimonial), audit_log writer (reads `current_setting('app.user_id', true)` and `app.request_id`), append-only guard on audit_log, deferrable unique ordering on project_media/project_metrics.
3. Migration 0003: roles `migrator` and `app_rw` with least-privilege GRANTs (app_rw: no DDL, audit_log INSERT/SELECT only, no TRUNCATE).
4. Drizzle schema in lib/db/schema.ts mirroring the SQL exactly; a `withActor(userId, requestId, fn)` helper that opens a transaction and runs `SET LOCAL app.user_id/app.request_id`.
5. Seed script: one owner user (password from env, printed never), site_settings row, 3 industries, 4 services, and 4 DEMO projects as `draft` with obviously fake content labelled "نمونه". Seed must refuse to run when NODE_ENV=production unless `--force`.
6. Tests in tests/db (Vitest, real Postgres from docker, fresh DB per run): for EVERY rule in CLAUDE.md section 4 write a test that executes the violating statement and asserts it is rejected, plus a happy-path test. Include: illegal status transition, publishing without cover, publishing testimonial without consent, duplicate slug (active) allowed again after soft delete, audit rows created with actor, audit UPDATE/DELETE rejected as app_rw, optimistic-lock conflict, app_rw cannot DROP/ALTER.

Acceptance: `npm run test:db` green; list in your report each constraint and the test that proves it. Anything you chose not to enforce in DB must be listed with the reason.
```

---

## Phase 2 — Auth, admin shell, audit

```
Plan first, wait for approval.

Implement authentication and the admin shell.

1. lib/auth: argon2id hashing, session create/validate/rotate/revoke (token random 32 bytes, store sha256 in sessions, sliding expiry with absolute max), `requireRole('owner'|'editor')` for server actions and route handlers, login lockout using failed_logins/locked_until, generic error messages, constant-time paths.
2. Routes: /admin/login, /admin (dashboard with counts: published/draft projects, new leads, last audit events), logout. Admin layout: RTL, shadcn/ui, sidebar (Projects, Clients, Services, Testimonials, Media, Leads, Settings, Users[owner], Audit log[owner]), noindex via metadata + header.
3. Middleware/proxy-level guard for /admin/** and all admin mutations; Origin check on mutations.
4. Strict CSP with nonces applied to the whole app (landing stays compatible with GSAP/Lenis, no `unsafe-eval`).
5. Every mutation runs through `withActor(...)` so audit_log is filled.
6. Tests: unit tests for session logic, e2e (Playwright) for login success/failure/lockout/logout, and a test proving an `editor` cannot open Users/Audit pages or call their actions.

Acceptance: all tests green; no admin route reachable unauthenticated (prove with an automated route-sweep test).
```

---

## Phase 3 — Media pipeline

```
Implement lib/media and the Media library page in admin.

- Upload via server action/route handler: size caps per kind, magic-byte MIME detection (allowlist: jpeg, png, webp, avif, mp4, webm), reject everything else.
- Images: sha256 dedupe (reuse existing asset), re-encode with sharp (strip EXIF), generate AVIF + WebP + JPEG fallback at widths 480/768/1280/1920 (never upscale), compute width/height and dominant color, store variants metadata in media_assets.variants, write files to a mounted /uploads volume with random filenames. Videos: store as-is with size cap + require a poster image.
- Admin UI: grid, upload with progress, required Persian alt text (alt_fa) before an image can be attached to published content, usage count, safe delete (blocked if referenced, enforced by FK RESTRICT; show a friendly message).
- A reusable <ResponsivePicture /> server component that outputs <picture> with width/height, dominant-color background, lazy/priority props.

Acceptance: tests for MIME spoofing (renamed .exe/.svg rejected), dedupe, EXIF stripped, FK-protected delete. Report real file sizes of generated variants for one sample photo.
```

---

## Phase 4 — Admin CRUD modules

```
Implement admin CRUD for: Projects (the biggest), Clients, Services, Industries/Tech tags, Testimonials, Site settings, Leads inbox, Users (owner), Audit log viewer (owner, read-only, filter by table/actor/date).

Projects editor requirements:
- Fields per CLAUDE.md; client + industry selects; multi-select services and tech; cover picker and gallery with drag-and-drop reorder (single transaction, deferrable unique ordering); metrics editor (label + value text; helper text: "فقط اعداد واقعی و قابل اثبات"); links; SEO fields with live length counters.
- Workflow buttons: Save draft, Publish, Unpublish, Archive. Show the DB publish-gate errors as human-readable Persian messages listing exactly what is missing.
- Optimistic locking: if the row version changed, show a conflict dialog instead of overwriting.
- Autosave of drafts is NOT required; unsaved-changes warning is.
- Publishing/unpublishing/reordering calls revalidateTag for the landing page.
- Zod schemas shared between form and server action.
Leads: list with status filter, change status, internal notes, CSV export (owner), retention note.
Settings: edit hero copy, CTA label, contact info, socials, default SEO; validates against DB CHECKs.

Acceptance: e2e tests: create project -> try publish without cover (blocked) -> add cover + service -> publish -> appears on landing after revalidate. Two-browser concurrent edit conflict test. Editor role cannot manage users.
Keep admin UI plain and fast; no animation libraries in admin. Admin is not designed in the design system: build it with shadcn/ui but restyle it only with the Grin Web tokens (components/ds Button, Field, Chip, Modal where they fit; danger variant for destructive actions), RTL, Persian digits. No new colors.
```

---

## Phase 5a — Design system into code (before any page)

```
Read CLAUDE.md section 7, then everything in /design: README.md, SKILL.md, guidelines/layout.md, guidelines/motion.md, tokens/*, every components/*/*.prompt.md and *.d.ts, ui_kits/landing/. The design system is the source of truth.

1. Tokens: generate `app/tokens.css` from design/tokens/*.css and a Tailwind v4 `@theme` mapping from tokens.json via `scripts/gen-tokens.ts` (so `bg-paper text-ink bg-lapis` resolve to CSS variables; `[data-theme]` light/dark kept). Add `npm run tokens:check` that fails on raw hex/px colors in /app and /components. Wire design/_adherence.oxlintrc.json into lint.
2. Fonts: next/font/local or @font-face from public/fonts, font-display: swap, preload only Vazirmatn-UI-FD-Regular and Estedad-ExtraBold; set html lang="fa" dir="rtl".
3. Port every component in design/components to TypeScript React in components/ds (Button, Chip, Field, Icon, Metric, Modal, Navbar, ProjectCard, CropFrame, CoverArt, Testimonial) with identical markup and gw-* classes (reuse design/components/*.css and bundle.css as-is), props typed from the .d.ts, an `index.ts` barrel. Replace the CDN-fetching Icon with lucide-react (explicit icon map, tree-shaken). Keep Modal's focus trap/ESC/scroll-lock behaviour; make them Server Components unless they need state.
4. Visual regression: a Playwright test per component that screenshots our component next to the `*.card.html` from the design export at the same viewport; diff must be below a small threshold.
5. Build `/dev/design-system` (noindex, 404 in production) rendering all tokens and components in both themes.

Acceptance: typecheck, lint, tokens:check, visual tests pass; no component deviates from its .prompt.md rules. STOP and show me /dev/design-system screenshots (desktop and 390px). Wait for approval.
```

---

## Phase 5b — Public landing (composed from the design system, content from DB)

```
Build the landing at app/(site) as React Server Components with ISR, data from DB only. Compose it strictly from components/ds, following design/ui_kits/landing/Landing.jsx (section order, structure) and design/guidelines/layout.md. The kit is a visual reference; do not copy its demo data.
- Sections in the order from CLAUDE.md section 6. Hero headline/CTA come from site_settings; the same primary CTA label repeats in navbar, hero and contact.
- Selected Work: featured projects first; cards use ProjectCard with <ResponsivePicture /> as the cover (CoverArt only as a fallback when a project has no image); filter chips; clicking opens the DS Modal (deep link /#work/slug, focus trap, ESC) with challenge/solution/outcome, metrics, gallery, live link. Without JS the card links to /work/<slug> (statically generated route with JSON-LD).
- Results and Testimonials render only when published data exists. Placeholder/demo copy is labelled «نمونه».
- Contact: server action, Zod, honeypot, min-fill-time, rate limit by ip hash, writes `leads`, inline Persian success/error via the DS Field states, optional Telegram/Bale notification via env (skipped if unset).
- No JS animation yet (CSS hover/focus only). The page must pass the budget without GSAP/Lenis.
- Mobile: follow the 390px behaviour in the design (display-md hero, strip as vertical list).

Acceptance: Lighthouse CI (mobile) meets CLAUDE.md section 3 with seeded demo content; works with JS disabled; axe finds no serious issues; side-by-side screenshots against design/ui_kits/landing/index.html at 1440 and 390 show no unexplained differences (list any).
```

---

## Phase 6 — Motion layer (GSAP + Lenis + React Bits) with performance gating

```
Add motion on top of the working landing, without breaking the budget.

1. lib/motion/capabilities.ts: `shouldAnimate()` and `canRunHeavyEffect()` using prefers-reduced-motion, saveData, hardwareConcurrency, deviceMemory, viewport width.
2. lib/motion/loader.ts: dynamic-import GSAP, ScrollTrigger, SplitText and Lenis after first paint (requestIdleCallback with timeout fallback). Wire Lenis+ScrollTrigger exactly as documented in docs/LIBS.md (single raf source = gsap.ticker). Destroy on unmount; respect route/modal scroll locking (lenis.stop/start when the modal is open; data-lenis-prevent on scrollable modal content).
3. Hero: one entrance animation using a React Bits text effect (install via the shadcn registry, TS-TW variant; read its source and strip anything we don't use). The initial CSS state must not hide content from users without JS and must not cause CLS.
4. Portfolio strip: pinned horizontal scroll with ScrollTrigger, direction correct for RTL, only on >= 768px and when motion is allowed; below that or with reduced motion render the normal list. Use gsap.context / useGSAP so everything cleans up.
5. At most one lightweight background effect in the hero (CSS/SVG first; canvas/WebGL only if it passes the budget), paused offscreen.
6. Follow design/guidelines/motion.md exactly (durations/easings from tokens; transform and opacity only). Record any deviation and every motion decision (what, why, cost) in design/decisions.md.

Acceptance: re-run Lighthouse CI against the budget; report before/after numbers and JS bytes added. If the budget fails, remove effects until it passes — the budget wins over the animation. Test with CPU 4x throttle that scrolling stays smooth (report the measured long tasks).
```

---

## Phase 7 — SEO, accessibility, hardening, QA

```
Final quality pass.

- SEO: metadata from site_settings, canonical, OG/Twitter image generated from the first featured project cover (pre-generated, static), sitemap.xml, robots.txt (disallow /admin), Organization + CreativeWork JSON-LD built only from published DB data.
- Accessibility: axe on landing + modal + admin pages; keyboard-only walkthrough test in Playwright; RTL checks; reduced-motion test.
- Security: run through CLAUDE.md section 5 as a checklist, prove each item (test or curl evidence). `npm audit` clean or documented.
- Failure modes: what happens when Postgres is down (landing keeps serving cached HTML, contact form shows friendly error and does not lose the message silently), when upload disk is full, when Telegram/Bale API is unreachable (lead still saved).
- Content gate: a script `npm run check:content` fails the build/deploy if any published row still has "نمونه" demo markers.

Acceptance: report with evidence for each item; list residual risks honestly.
```

---

## Phase 8 — Deploy on our server

```
Plan first, wait for approval.

Produce a reproducible deployment in /deploy:
- docker-compose.prod.yml: app (standalone, non-root, read-only FS except /uploads and /tmp), postgres (volume, no public port, app_rw credentials), nginx (TLS termination, brotli/gzip, HTTP/2, security headers, `limit_req` for /admin/login and the contact endpoint, serves /uploads and /_next/static directly with immutable caching, proxies the rest).
- One-shot migration job using the `migrator` role before the app starts.
- backup.sh: nightly pg_dump (compressed, retention 14 days) + rsync of /uploads; restore.sh and a documented restore test.
- RUNBOOK.md in plain steps: first deploy, update, rollback, rotate secrets, create owner user, restore from backup, where logs are.
- Healthcheck endpoint (/api/health: DB reachable, no sensitive data), container healthchecks, log rotation.
- No dependency on any external CDN/registry at runtime. If the server has restricted outbound access, document how to build the image elsewhere and `docker load` it.

Acceptance: fresh-VM dry run described step by step (or executed locally with docker), TLS config validated, backup restored into a scratch DB and verified, Lighthouse run against the deployed URL. Report what you could not verify without the real server.
```
