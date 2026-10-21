# Grin Web Design System

Brand book and implementation contract for **Grin Web** — a Persian-first (RTL) studio that builds websites and custom software. Surfaces: a single-page portfolio landing and an admin panel that feeds it (projects, results, testimonials, site settings).

**Concept — a printed project dossier.** Square-cornered project covers, hairline rules, printer's crop marks as the one signature device, one lapis-blue accent, quiet typography. The palette is named after Persian materials: **Lapis (لاجورد)** and **Saffron (زعفران)**, with **Firouzeh (فیروزه)** as a decorative third.

## Sources
- GitHub: https://github.com/mohammadch77/resume — attached as the source repo; at build time (2026-10-21) it was **empty** (no commits readable), so nothing was imported from it. Explore it again once code lands — it will be a better guide to the real product than this from-scratch system.
- Fonts (OFL): Estedad — https://github.com/aminabedi68/Estedad · Vazirmatn UI Farsi-Digits — https://github.com/rastikerdar/vazirmatn
- Icons: Lucide — https://lucide.dev (not bundled; loaded from CDN)
- No logo exists. **Do not invent one** — set the name «Grin Web» in Estedad 800 wherever a mark would go.

## Index
- `styles.css` — the one file to link (imports only).
- `tokens/` — `fonts.css`, `colors.css` (light `:root` + `[data-theme="dark"]`), `typography.css`, `spacing.css` (space, radius, shadow, motion, z), `base.css`, `tokens.json` (same values for build tooling).
- `fonts/` — `Estedad-ExtraBold.woff2`, `Vazirmatn-UI-FD-Regular.woff2`, `Vazirmatn-UI-FD-SemiBold.woff2`.
- `components/` — `bundle.css` (all `gw-*` classes) + one folder per component (`.jsx`, `.d.ts`, `.prompt.md`, `.css`, preview card).
- `guidelines/` — foundation specimen cards, the Cover, `motion.md`, `layout.md`.
- `ui_kits/landing/` — interactive reference composition of the landing page.
- `SKILL.md` — Agent Skill entry point. `github.md` — source-repo record.

## Components
Plain HTML + CSS classes prefixed `gw-` (framework-free contract); the React files are thin renderers of that exact markup.
- **Button** — `gw-btn` · primary (lapis), secondary (outline), quiet, danger, sm, disabled, icon-only
- **Field** — `gw-field` · label, hint, invalid (icon + words), disabled, textarea
- **Chip** — `gw-chip` · tag, outline, filter (`aria-pressed`), status success / warning / danger
- **Navbar** — `gw-nav` · sticky capsule, anchor links, CTA, mobile sheet
- **ProjectCard** — `gw-project` · 4:3 square cover in crop marks, tags, title, summary, CTA
- **Metric** — `gw-metric` · stat numeral, label, source, top rule
- **Testimonial** — `gw-quote` · 4px saffron start-edge rule
- **Modal** — `gw-scrim` + `gw-modal` · case-study dialog: title, tags, cover, challenge/solution/outcome, actions

### Intentional additions
- **CropFrame** — exposes the crop-mark device on its own (ProjectCard, Modal and the hero use it).
- **CoverArt** — 4:3 cover: real image, or one of four token-only placeholder compositions.
- **Icon** — Lucide loader at 1.5px stroke, since no icon set is bundled.

---

## Content fundamentals
- **Voice:** formal-warm Persian. Address the reader as «شما». Confident, specific, never salesy. Short sentences.
- **Case:** sentence case for every heading and label (Latin terms included: "Case study", not "CASE STUDY"). No uppercase eyebrows.
- **Buttons state the outcome.** «درخواست مشاوره رایگان», «مشاهده نمونه‌کارها», «مشاهده‌ی جزئیات پروژه». Never «ارسال», «کلیک کنید», «بیشتر».
- **One primary CTA label**, repeated identically in navbar, hero and contact: «درخواست مشاوره رایگان».
- **Digits:** Persian digits everywhere (Vazirmatn UI FD renders them automatically; still write «۱ از ۴» in source). Phone numbers sit in an LTR span.
- **Dates:** Shamsi, day-month-year: «۲۴ مهر ۱۴۰۵».
- **No emoji. No exclamation-mark hype.**
- **Never invent proof.** No made-up numbers, clients, logos or quotes. Use bracketed placeholders — «[تعداد] پروژه», «[نام مشتری]», «[لوگو]» — and label demo content «نمونه» with `.gw-sample`. Results and Testimonials are omitted when the admin panel has no real data.
- **Errors are instructions:** «شماره را با ۰۹ شروع کنید.» — not «ورودی نامعتبر».
- Examples: hero «سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد» · contact «درباره‌ی پروژه‌تان بگویید» · consent «با ارسال این فرم، با تماس ما برای هماهنگی جلسه موافقت می‌کنید.» · success «درخواستتان رسید. تا یک روز کاری تماس می‌گیریم.»

## Visual foundations

### Color — and where each text color may sit
- Grounds: `--color-paper` (page), `--color-raised` (cards, form, navbar, modal), `--color-sunken` (Selected Work, Results, Contact wells). Footer uses `--color-ink` as ground.
- `--color-ink`, `--color-ink-muted`, `--color-ink-subtle` → allowed on paper, raised, sunken. `ink-subtle` is for sources, hints, captions — never body paragraphs.
- `--color-paper` as text → only on `--color-ink` (footer).
- `--color-lapis-text` → links/numerals on paper, raised, sunken, lapis-tint.
- `--color-on-lapis` → only on `--color-lapis` / `--color-lapis-deep`.
- `--color-on-saffron` → only on `--color-saffron`. `--color-saffron-text` → on paper, raised, saffron-tint.
- `--color-success` / `--color-danger` → on their `-tint` or on raised/paper, **always with an icon or word**.
- `--color-firouzeh` → decorative fills only, **never text**.
- `--color-line` → decorative separators only. `--color-line-strong` → control borders, crop marks, Metric rule (≥ 3:1).
- Every pair above is verified ≥ 4.5:1 (3:1 for borders and focus ring) in **both** themes — see the live "Contrast pairs" card.
- **Lapis is the one accent.** Use it for the primary CTA, links, active/pressed states, one block per hero.
- **Saffron appears once per screen area** (the testimonial rule, or one cover highlight).
- Avoid: gradients, cream + terracotta, near-black + acid green.

### Type
- Display = Estedad 800 (`--font-display`) for display-xl/lg/md, heading-1/2/3, stat. Body/UI = Vazirmatn UI FD 400/600 (`--font-sans`).
- Scale: display-xl 72/86 (hero) · display-lg 56/68 (section) · display-md 44/56 · heading-1 36/54 · heading-2 28/44 · heading-3 22/38 · stat 64/76 · body-lg 19/37 · body 17/33 · body-sm 15/29 · label 14/22 600 · caption 13/25 · button 16/24 600. Utility classes: `.gw-t-<name>`.
- Persian body line-height ≥ 1.9; prose measure 60–68 characters (`.gw-prose`, `--measure-prose: 64ch`). `text-wrap: pretty` on paragraphs, `balance` on headlines.
- No letter-spacing on Persian; no italics (Persian has none); no all-caps.

### Spacing, shape, borders
- 4px base: `--space-1`…`--space-10` = 4 8 12 16 24 32 48 64 96 144. Sections breathe at `--space-9` (96) desktop / `--space-8` mobile.
- Radius: `--radius-none` covers and frames; `--radius-sm` (6) controls; `--radius-md` (12) modal and navbar; `--radius-pill` chips only.
- **Borders, not shadows.** Cards and sections are separated by 1px hairlines and grounds. `--shadow-overlay` is allowed only on floating overlays (Modal). No identical rounded cards with the same shadow.
- Cards: no box, no shadow — a crop-marked cover with text beneath. Forms sit on a raised, square-cornered panel with a `--color-line` border.

### The crop-mark device
Four corner ticks (1px, `--color-line-strong`, 10–14px long) around a square-cornered cover, offset from the trim edge. Hover turns them `--color-lapis`. Use only around project covers and hero frames — never around text, buttons or forms. It is the only ornament.

### Imagery
Real project screenshots, square-cornered, 4:3 (16:7 inside the modal). Until they exist, use `CoverArt` art 1–4: flat token blocks, labelled «نمونه». No stock photography, no illustrations, no SVG decoration, no blur or transparency effects (the scrim is the only translucency).

### States
- Hover: color/ground shifts only — primary → `lapis-deep`; secondary → ink border + raised ground; quiet → `lapis-tint` ground; links → `lapis-deep`; crop marks → lapis; cover art scales 1.03 inside its frame.
- Press: `translateY(1px)`. Focus: 2px `--color-focus-ring` outline, 2px offset, on every interactive element.
- Selected filter chip: ink fill, paper text, check icon. Disabled: sunken ground, ink-subtle text, `line` border.
- Invalid field: danger border + circle-alert icon + instruction text.

### Spend boldness in one place
The Selected Work strip is the signature moment: sunken ground, display-lg heading, 420px ProjectCards starting at the content edge (right) and running off the left edge, with a thin lapis progress line «۱ از ۴». Everything else stays quiet.

## Iconography
- **Lucide** line icons at **1.5px stroke**, 20px default (16px in chips, sm buttons, errors), `currentColor`.
- **None are bundled.** The `Icon` component fetches `lucide-static@0.460.0` SVGs from unpkg and rewrites the stroke to 1.5. For production, install `lucide-react` and pass `strokeWidth={1.5}`.
- Icons accompany words; never an icon alone for status. Icon-only buttons need a `label`.
- RTL: "forward/next" is `arrow-left`. Don't mirror icons that aren't directional.
- No emoji, no unicode glyphs as icons, no icon fonts.

## Motion
Full rules in `guidelines/motion.md`. Summary: hero entrance once; scroll-pinned project strip; hover and modal transitions only. Animate `transform` and `opacity` only. Durations `--duration-fast` 140ms (hover/press), `--duration-base` 240ms (modal, menu), `--duration-slow` 700ms (hero entrance, cover zoom); easing `--ease-out` for entrances, `--ease-standard` for scroll-linked moves. Honor `prefers-reduced-motion`. At most one WebGL effect, site-wide.

## Layout and RTL
Full rules in `guidelines/layout.md`. Summary: 12/8/4-column grid, 1200px content (`--content-max`), 24px gutter. Section order: Navbar → Hero → Selected Work → Services → How we work → Results → Testimonials → Clients → Contact → Footer. CTA repeated 3× with the same label. Results/Testimonials omitted when empty.

## Implementation contract
- Link `styles.css` (or ship `tokens/*.css` + `components/bundle.css`). Tokens are CSS custom properties; light on `:root`, dark on `[data-theme="dark"]` on `<html>`.
- `<html lang="fa" dir="rtl">`. **Logical properties only** (`margin-inline-start`, `inset-inline-end`, `padding-block`, `border-inline-start`) — no `left/right` in component CSS.
- Preload only `Vazirmatn-UI-FD-Regular.woff2` and `Estedad-ExtraBold.woff2`; `font-display: swap`.
- Tailwind v4 mapping — token names already follow v4 namespaces:
```css
@import "tailwindcss";
@import "./design/tokens.css";
@theme inline {
  --color-paper: var(--color-paper); --color-raised: var(--color-raised); --color-sunken: var(--color-sunken);
  --color-ink: var(--color-ink); --color-ink-muted: var(--color-ink-muted); --color-ink-subtle: var(--color-ink-subtle);
  --color-line: var(--color-line); --color-line-strong: var(--color-line-strong);
  --color-lapis: var(--color-lapis); --color-lapis-deep: var(--color-lapis-deep); --color-lapis-tint: var(--color-lapis-tint);
  --color-lapis-text: var(--color-lapis-text); --color-on-lapis: var(--color-on-lapis);
  --color-saffron: var(--color-saffron); --color-on-saffron: var(--color-on-saffron); --color-saffron-text: var(--color-saffron-text); --color-saffron-tint: var(--color-saffron-tint);
  --color-firouzeh: var(--color-firouzeh); --color-success: var(--color-success); --color-success-tint: var(--color-success-tint);
  --color-danger: var(--color-danger); --color-danger-tint: var(--color-danger-tint); --color-focus-ring: var(--color-focus-ring);
  --font-display: var(--font-display); --font-sans: var(--font-sans);
  --spacing: 4px; /* p-1 = 4px … p-36 = 144px */
  --radius-sm: 6px; --radius-md: 12px; --radius-pill: 999px;
  --ease-out: var(--ease-out); --ease-standard: var(--ease-standard);
}
```
  Type sizes use the v4 `--text-<name>` / `--text-<name>--line-height` pairs, so `text-display-xl`, `text-body` etc. resolve directly.
- `tokens/tokens.json` holds the same values (light/dark) for codegen and a `tokens:check` lint.
