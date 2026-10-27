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
1. **Navbar** — sticky capsule: wordmark, anchors (نمونه‌کارها، خدمات، مشتریان), CTA.
2. **Hero** — display-xl (display-md on mobile), lead, primary + secondary CTA, proof line with placeholders; two overlapping crop-marked covers over one lapis block.
3. **Selected Work** — sunken ground, display-lg heading, filter chips, horizontal strip of 420px ProjectCards from the content start edge running off the far edge, progress line «۱ از ۴». Mobile: vertical list.
4. **Services** — `ServiceGrid` of `ServiceCard`s (2 columns from 760px, 1 below; hairline cards, icon tile, Persian index; no hover, they are not links) from the database, then the **CTA band** (`CtaBand`): lapis block with a saffron rule and the on-lapis button in the light theme, `--color-lapis-tint` with a lapis frame in the dark theme.
5. **Results** — 3 Metric components from the admin panel. **Omitted when empty.**
6. **Testimonials** — one quote, saffron rule. **Omitted when empty.**
7. **Clients** — real logos only; dashed «[لوگو]» frames as placeholders.
8. **Footer** — ink ground, paper text; brand, a plain text link with the CTA label (href from the site settings: `tel:`, `https://` or `#anchor`, `#contact` while empty) and the copyright line.

## CTA rule
The primary CTA «درخواست مشاوره رایگان» is a button exactly 3 times — navbar, hero, the services CTA band — with the identical label, linking to `/contact`. The footer repeats it as a plain link, never as a button. There is no contact section: the form (name, phone, message, outcome-worded submit, consent caption; `ContactForm`) opens in a drop-in `Dialog` over the page when a CTA is clicked, and is the whole of the `/contact` page without JavaScript.

## Density
- Touch targets ≥ 44px (Button md is 48px; sm 36px is desktop/admin only).
- Saffron once per screen area; lapis blocks max one per section (the services section's one lapis block is the CTA band).
