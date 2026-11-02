# Design decisions

The look of the site is defined by `reference/lumora-prompt.md` and the two hero images in `reference/hero/` (owner decision, v2
redesign; the old Grin Web design system is retired and is deleted in phase 5). This file records where we deliberately go
beyond or around the reference, and why. CLAUDE.md section 7 is the rule; this is the reasoning.

## v2 (Lumora-derived)

- **Tokens** live in `tokens.json`; `scripts/gen-tokens.ts` generates `app/tokens.css` and `app/theme.css`. Palette: white, `#f1f0ee`,
  ink `#141414`, one accent `#ec3f1e`. No dark theme (owner: not needed now), the admin included.
- **The accent and contrast.** `#ec3f1e` is 3.97:1 on white. It is therefore a fill colour (ink text on it: 4.65:1), a large-type and focus-ring
  colour (3:1 is enough there), never small text on white. Small accent-coloured text uses `accent-ink` `#cc310f` (5.23:1), the same hue, darker.
  Hover on the accent button is a lighter accent (`#f25a3d`, ink on it 5.53:1) because darkening would fail the ink label.
  Success and danger keep their own functional colours (forms and the admin need them; they are not decoration).
  `npm run design:contrast` checks 24 pairs.
- **Font.** Estedad 400 + 600 (official OFL release, subset to Persian + Latin + digits, ~32 KB each), one family. Compared with Onest
  (Lumora's face) side by side: Estedad's Latin letterforms are the same geometric grotesque, a little narrower; its Persian is clean and
  geometric. Only the 600 face is preloaded (the headline); 400 swaps in with the first body text.
- **Persian adaptations of the reference.** No letter-spacing (it breaks joining), headline line-height 1.3+ (the line-reveal clips with
  overflow and Persian marks need room), no uppercase labels, logical CSS properties, mirrored arrows, Persian digits.
- **Root size.** Lumora's pure-vw root size is replaced by `clamp(15px, calc(0.6rem + 0.45vw), 22px)` on the landing only
  (`:root:has(.lm-root)`): zoom and the user's font-size preference keep working (WCAG 1.4.4); the admin is untouched. A test proves 200% zoom
  enlarges the text by about 1.9x.
- **Dropped from the reference:** the full-screen loader (it blocks the 1.8 s LCP budget; the hero entrance stays), react-spring (CSS transitions
  and GSAP instead), the "We Build Better" pill band (an English word game; the services CTA band takes its place), Google Fonts / unpkg /
  getlayers CDNs. Service rows are static (no hover fill or arrow: they go nowhere). The portfolio is a two-column grid, not the old pinned strip.
- **Menu** is in the HTML and opens with `:target` without JavaScript; JavaScript adds the focus trap, Escape and the scroll lock.
- **Contact flow** (carried over): every CTA is a real link to `/contact`; with JavaScript a click opens the same form in a drop-in
  `PageDialog`. One form, one server action, one result. `/contact` is `noindex` and not in the sitemap. The CTA is a button three times
  (Navbar, hero, services band) and a plain link in the footer.
- **Motion gate** (carried over): `lib/motion/caps-script.ts` sets `data-motion` from reduced motion, `saveData === true`, a reported deviceMemory <= 2 and
  IntersectionObserver. **The core count and 4 GB memory limits were removed** (owner decision, hero fix): Firefox reports 4 cores and no memory on ordinary
  laptops, which switched the star effect off for real visitors. The "<= 4 cores / <= 4 GB" rule of CLAUDE.md section 3 is for heavy WebGL; the trail is a light 2D canvas
  and `lib/motion/frame-guard.ts` stops it (and removes the canvas) when its first 2 s of drawing average over 30 ms a frame; Lenis (wheel only) and GSAP load lazily after first paint. Every effect is measured with `npm run motion:cost` and the
  A/B script; lab TBT noise is about +-85 ms, so a single run is never trusted.
