# Design decisions (ours, on top of the exported design system)

The export in this folder is read-only. This file records where the site deliberately goes beyond or around it, and why.

## Motion (Phase 6)

Source of truth: `guidelines/motion.md` (four moments: hero entrance, pinned strip, hover, modal). Hover and modal motion
are already CSS in the export and cost no JavaScript. The rest is gated in one place, `lib/motion/caps-script.ts`.

### Hero entrance: plain CSS keyframes, no React Bits, no text splitting

The brief allowed React Bits for the hero entrance if one of its effects worked word by word, and asked for plain GSAP
otherwise. Persian joins letters, so the text is never split into characters; it is not split into words either, because
the guideline moves whole elements (headline, lead, actions, covers), 60 ms apart.

React Bits candidates, read from the registry source (`https://reactbits.dev/r/<Name>-TS-TW.json`):

- **SplitText**: GSAP based and it can split by words (`splitType="words"`). Rejected: it hides the text until GSAP and the
  fonts have loaded (it animates `from` an opacity of 0 after load), which breaks "the hero must look complete without
  them" and delays the LCP element; it triggers through ScrollTrigger; its default travel is 40 px, the guideline says 12 px.
- **BlurText**: splits by words (`animateBy`), but it depends on the `motion` library (a second animation engine) and
  animates `filter: blur`, which `motion.md` forbids ("transform and opacity only, never filters or blur").

Plain GSAP was also rejected for the entrance itself, for a reason that is not about React Bits: a GSAP `from` runs after
JavaScript has loaded, so the visitor first sees the finished hero, then it disappears and fades in. The entrance is therefore
CSS keyframes (`lk-rise`, `lk-rise-still`, `lk-slide` in `components/site/landing.css`), switched on by `html[data-motion~="enter"]`,
an attribute that a 600-byte inline script sets before first paint (never for reduced motion, saveData, 4 cores or fewer, 4 GB
or less, or no IntersectionObserver). It costs 0 KB of JavaScript, plays once, and cannot replay on scroll-back.
GSAP stays where scroll-linked behaviour needs it (the strip, Lenis' clock).

The headline and the two covers only move (they do not fade): one of them is the LCP element on every layout, and a fade
from opacity 0 delayed the LCP by about 300 ms in the first measured version.

If the owner wants GSAP for the entrance anyway, the cost is the flash described above plus the GSAP core on the page-load path (today it loads only on
desktop, after paint); the switch is local to `Hero` and `landing.css`.

### Pinned strip: native `position: sticky`, `scrollLeft` as the output

`motion.md` says the strip pins and translates. We pin with CSS `position: sticky` and a spacer as tall as the strip's
horizontal reach, and use ScrollTrigger only to report progress. Reasons: a library pin wraps the section in a new element,
and moving an element in the DOM drops keyboard focus (found by a test: a visitor whose first action was Tab onto a card
lost focus when the pin was built); the compositor pins without the jitter a JS pin shows next to Lenis; the dialog lives
inside the section and stays valid.

The strip's position is written to its own `scrollLeft` instead of a CSS transform. This breaks "transform and opacity only"
in letter: setting `scrollLeft` is a scroll operation (no layout, no paint of its own), and it keeps one source of truth for
the «۱ از ۴» progress, find-in-page and keyboard focus. On RTL pages `scrollLeft` runs negative.

Where it does not pin (stays the native scroll-snap scroller): under 1024 px, touch or coarse pointer, reduced motion,
low-end devices, a viewport too short for the section to fit, a visitor who already scrolled past the section, and while a
case study dialog is open.

### Focus and the dialog

A focused card must always be fully on screen: tabbing makes the browser scroll the strip, so the page scroll is moved to the
matching position (`lib/motion/strip-pin.ts`, tests in `tests/e2e/motion.spec.ts`). Opening a case study calls
`setScrollLocked(true)` (`lib/motion/scroll-lock.ts`), which stops Lenis; the dialog's scrolling element carries
`data-lenis-prevent`, so even a running Lenis leaves the wheel to the dialog.

### Measuring a motion effect

`npm run motion:ab -- <effect>` alternates the effect on and off in one build (Lighthouse, median of N) and
`npm run motion:cost` measures the main-thread time of what is built on first interaction. Findings (details in `docs/BACKLOG.md`):
the Lighthouse TBT of two identical pages differs by up to about 85 ms between arms (A/A control), so the 25 ms rule cannot be
decided by the lab TBT alone; effects are judged on the A/B, the A/A noise, and the direct cost together.


## Services, CTA band, footer link (Phase 7, owner-approved proposal)

Added by us on top of the export. The export has no JSX for them; they live in `design/components/service-card`, `design/components/cta-band`
(CSS, `.d.ts`, `.prompt.md`) and as typed ports in `components/ds`. The adherence lint (`design/_adherence.oxlintrc.json`) got prop whitelists for
`ServiceCard`, `ServiceGrid` and `CtaBand`, and the `on-lapis` value for `Button`'s `variant`.

- **ServiceCard + ServiceGrid (`gw-service`, `gw-service-grid`).** Replaces the four hairline-topped columns. A 2 x 2 grid of hairline cards reads
  faster than four narrow columns of Persian text; the icon sits in a bordered tile, the index is a Persian numeral in
  `--color-lapis-text`. No new token. **No hover state**: a card is not a link, and a hover that changes the border says "click me" (ui-ux-pro-max:
  `hover-vs-tap`). Border `--color-line`, tile border `--color-line-strong` (3.76:1 / 3.85:1 non-text).
- **CtaBand (`gw-band`).** One sentence of context and the section's single primary action. Light theme: `--color-lapis` ground, `--color-on-lapis` text, a 4px
  saffron rule on the inline-start edge (saffron once in this area), the new **`Button variant="on-lapis"`** (white with lapis text; lapis on lapis would vanish).
  Dark theme: lapis is pale there (`#8c9bff`) and would be a large light slab on a dark page, so the ground is `--color-lapis-tint` with a lapis frame, ink text and
  the normal lapis button (same variant name, restyled under `[data-theme="dark"]`). Focus: the default ring (`--color-focus-ring`) has 1.5:1 on lapis, so
  inside the band it is `--color-on-lapis` (light) or the normal ring (dark).
- **Footer link.** `.lk-foot__link`: paper text, underlined, 44px tall, a plain link (never a button; the CTA is a button four times, see below). The footer's default
  focus ring is as dark as the ground (1.42:1), so `.lk-foot :focus-visible` uses `--color-paper` (15.8:1).
- **CTA count changed from 3 to 4 buttons** (Navbar, Hero, band, contact) plus the plain footer link. Updated: CLAUDE.md section 6,
  `design/guidelines/layout.md`, `tests/e2e/landing.spec.ts`, `tests/e2e/landing-sections.spec.ts`.
- **"How we work" removed.** The section, its copy (`components/site/process.ts`) and its anchor are gone; `layout.md` and the navbar lose the link.
  The export's own kit (`design/ui_kits/landing`) still shows it; it is a visual reference only.
- **Contrast is checked by script**: `npm run design:contrast` (also run as a unit test) computes WCAG ratios from the generated tokens for every listed pair in
  both themes (text 4.5:1, frames/icons/focus rings 3:1). It found the two focus-ring failures above before they shipped. New component colours must be added to its list.
- **Visual regression.** `tests/e2e/design-system.spec.ts` diffs our components against the export's own card pages. The three added components have no export
  counterpart, so they are covered by markup unit tests, `design:contrast`, axe on the landing in both themes (`tests/e2e/landing-a11y.spec.ts`) and the landing e2e.
  The `Button` card and the navbar card still match the export (the `on-lapis` variant adds a CSS rule only).
- **Icons** stay Lucide through the DS Icon map: `globe`, `smartphone`, `palette`, `search` were already in it; nothing was added, so the bundle is unchanged.
- **Tools.** ui-ux-pro-max supplied rules (single primary action, hover versus tap, touch targets, spacing scale, contrast); 21st.dev was used for three free
  searches only (metadata, no code retrieved, 0 of 2 daily retrievals spent). Its generic shadcn sections (solid-ground CTA, service card with hover) confirmed the
  patterns but nothing was imported: its output is Tailwind/shadcn markup that ignores the dossier concept, RTL tokens and fonts.


## Contact form as a drop-in dialog (Phase 8, owner-approved)

- **The contact section is gone.** The form opens from the CTA: a dialog over the landing with JavaScript, the `/contact` page without. The CTA links stay real links
  to `/contact` and one click handler (`components/site/contact-launcher.tsx`) turns them into "open the dialog"; a modified click (new tab) is left alone.
- **`Dialog` (new DS component, `gw-modal--drop`).** A small dialog on the Modal's frame and scrim that drops in from the top: `translateY(-1.5rem)` to `none` with
  opacity, 240 ms, `--ease-out` (the Modal's rise turned upside down; transform and opacity only). Closing is instant (motion.md). Reduced motion: the global 1 ms rule.
  `Modal` and `Dialog` share one behaviour hook (`components/ds/use-dialog.ts`): focus trap, Escape, scroll lock, focus returns to the trigger. The scroll lock is now
  counted, because two dialogs can overlap for a moment (a case study closing as the contact dialog opens) and each used to restore the overflow it had found.
  The Lenis lock is counted the same way (`lockScroll()` in `lib/motion/scroll-lock.ts`).
- **One result, two surfaces.** `ContactForm` is the same component in the dialog and on `/contact`; the server action, validation messages, honeypot, minimum fill time
  and rate limits are unchanged. After a successful send the dialog stays open and shows the confirmation (focus moves to it); the text no longer promises a time.
- **`/contact`** is `noindex`, not in the sitemap and not disallowed in robots.txt (a crawler must be able to read the noindex). It also carries the contact details
  from the site settings, which used to sit in the contact section.
- **Weight.** The dialog, the form and its server action are a separate chunk fetched by the first click (a plain dynamic import; `next/dynamic` added ~1.5 KB of loader to
  the first load). First-load JS on `/`: 158,373 B before, 158,770 B after (+397 B: the launcher and the shared dialog hook; the form itself left the first load).
- **Dev preview.** `/dev/landing-preview` renders the landing from literals in code (`components/dev/landing-preview-data.ts`): labelled «نمونه» cards drawn with the design
  system's placeholder art, no database, nothing publishable. It lives under `/dev`, whose layout answers 404 unless `ENABLE_DEV_PAGES`. The contact dialog is not mounted there.
