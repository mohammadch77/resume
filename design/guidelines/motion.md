# Motion — Grin Web

Motion is a page-turn, not a show. Four moments only:

1. **Hero entrance, once per visit.** Headline, lead and CTAs rise 12px and fade in, staggered 60ms, `--duration-slow` 700ms, `--ease-out`. The two hero covers slide 16px from inline-end. Never replays on scroll-back.
2. **Scroll-pinned project strip.** On ≥ 1024px with fine pointer, the Selected Work section pins while vertical scroll translates the strip along the inline axis (`--ease-standard`, scroll-linked); the progress line and «۱ از ۴» counter follow. Without JS (or on touch) it is a native horizontal scroller with scroll-snap — it must work fully without the pin.
3. **Hover.** Color/border shifts at `--duration-fast` 140ms; crop marks → lapis; cover art scales 1.03 over `--duration-slow`.
4. **Modal.** Scrim fades, dialog rises 12px, `--duration-base` 240ms, `--ease-out`. Close is instant-ish (140ms).

## Rules
- Animate **transform and opacity only**. Never width/height/top/left, never filters or blur.
- **No JS-free breakage:** content is visible by default; entrance classes are added by JS only after `IntersectionObserver` support is confirmed.
- **Reduced motion:** `prefers-reduced-motion: reduce` → no entrance, no pin (plain scroller), no cover zoom; state changes become instant (base.css enforces 1ms).
- **Low-end fallback:** skip the pin and entrance when `navigator.hardwareConcurrency <= 4`, `deviceMemory <= 4`, or `saveData` is on.
- **One WebGL effect at most**, site-wide, lazy-loaded after LCP, with a static fallback. Default: none.
- No parallax, no bouncing, no looping animation, no scroll-jacking outside the strip.
- Z-order: `--z-nav` 40, `--z-modal` 100, `--z-toast` 110.
