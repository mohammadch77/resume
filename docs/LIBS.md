# Libraries — verified usage for this project

Versions installed (checked with `npm ls`): gsap 3.15.0, @gsap/react 2.1.2, lenis 1.3.27, lucide-react, zod 4, drizzle-orm 0.45, @node-rs/argon2 2.2.2.

## GSAP
- License (from `node_modules/gsap/package.json`): "Standard 'no charge' license" — https://gsap.com/standard-license. Plugins such as `SplitText` ship in the package (`node_modules/gsap/SplitText.js`).
- Register plugins explicitly, only inside the lazy loader (never at module top level of a server/initial bundle):

```ts
const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
  import("gsap"),
  import("gsap/ScrollTrigger"),
  import("gsap/SplitText"),
]);
gsap.registerPlugin(ScrollTrigger, SplitText);
```

- In components use `useGSAP` from `@gsap/react` (auto-cleanup via `gsap.context`).

## Lenis (core only)
Options verified in `node_modules/lenis/dist/lenis.d.ts`: `syncTouch`, `autoRaf`, `anchors`, `respectReducedMotion`, `prevent`.

Sync with ScrollTrigger (from the Lenis README). Do **not** also set `autoRaf: true`:

```ts
const lenis = new Lenis({ syncTouch: false, anchors: true });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
// cleanup: lenis.destroy(); gsap.ticker.remove(tickerFn)
```

Scrollable modal content gets `data-lenis-prevent`; call `lenis.stop()` / `lenis.start()` while a modal is open.

## React Bits
- Installed as source through the shadcn registry. `components.json` already contains:
  `"registries": { "@react-bits": "https://reactbits.dev/r/{name}.json" }`
- Command pattern (from reactbits.dev/get-started/installation): `npx shadcn@latest add @react-bits/<Name>-TS-TW` (TypeScript + Tailwind variant).
- License: the installation page does not state it; the repository is https://github.com/DavidHDev/react-bits. CLAUDE.md records it as MIT + Commons Clause (free for commercial use) — **re-verify in the repo's LICENSE before shipping** (tracked in `docs/BACKLOG.md`).
- Heavy WebGL backgrounds (Ballpit-class) are forbidden by the performance budget.

## Argon2
`@node-rs/argon2` chosen over `argon2`: it ships prebuilt binaries (including musl/Alpine), so the Docker build needs no node-gyp toolchain.

## Icons
`lucide-react` with `strokeWidth={1.5}`; import named icons only (tree-shaken).
