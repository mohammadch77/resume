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
