# Layout and RTL — Grin Web

## Grid
- 12 columns ≥ 1024px · 8 columns 600–1023px · 4 columns < 600px.
- Content max `--content-max` 1200px, centered; gutter `--gutter` 24px (16px allowed < 400px).
- Section padding: `--space-9` 96px desktop, `--space-8` 64px mobile. Heading → content gap `--space-6`.
- Prose measure 60–68 characters (`--measure-prose`).

## RTL
- `<html lang="fa" dir="rtl">`. Start = right. The hero text column sits at inline-start (right); imagery at inline-end (left).
- Logical properties only: `margin-inline-*`, `padding-block-*`, `inset-inline-*`, `border-inline-start`. No `left/right` in components.
- LTR islands: phone, email, URL, code, the Latin wordmark — wrap in `dir="ltr"`.
- "Forward" arrows point left (`arrow-left`).

## Section order (landing)
1. **Navbar** — sticky capsule: wordmark, anchors (نمونه‌کارها، خدمات، روش کار، مشتریان), CTA.
2. **Hero** — display-xl (display-md on mobile), lead, primary + secondary CTA, proof line with placeholders; two overlapping crop-marked covers over one lapis block.
3. **Selected Work** — sunken ground, display-lg heading, filter chips, horizontal strip of 420px ProjectCards from the content start edge running off the far edge, progress line «۱ از ۴». Mobile: vertical list.
4. **Services** — 4 columns with top hairlines (2 at tablet, 1 on mobile).
5. **How we work** — 4 numbered steps, numerals in `--color-lapis-text`.
6. **Results** — 3 Metric components from the admin panel. **Omitted when empty.**
7. **Testimonials** — one quote, saffron rule. **Omitted when empty.**
8. **Clients** — real logos only; dashed «[لوگو]» frames as placeholders.
9. **Contact** — headline «درباره‌ی پروژه‌تان بگویید» + contact details; raised form (name, phone, message) with the primary CTA and consent caption.
10. **Footer** — ink ground, paper text.

## CTA rule
The primary CTA «درخواست مشاوره رایگان» appears exactly 3 times — navbar, hero, contact — with the identical label, always linking to `#contact`.

## Density
- Touch targets ≥ 44px (Button md is 48px; sm 36px is desktop/admin only).
- Saffron once per screen area; lapis blocks max one per section.
