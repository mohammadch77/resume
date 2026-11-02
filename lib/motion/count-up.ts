/**
 * Counts each figure of the stats panel up from 0 to its value, once, as it scrolls into view (1.2 s, ease-out). The HTML already holds the
 * final number (no JavaScript, crawlers and reduced motion all see it): a figure that is still below the fold when this runs is set to 0 and
 * counted when it arrives; one already in view is left alone, so nothing flashes. Persian digits. Plain DOM; returns the teardown.
 */
const FA = new Intl.NumberFormat("fa-IR", { useGrouping: false });
const DURATION = 1200;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export function startCountUp(root: ParentNode = document): () => void {
  const items = [...root.querySelectorAll<HTMLElement>("[data-count]")];
  const frames = new Set<number>();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      run(entry.target as HTMLElement);
    }
  });

  function run(el: HTMLElement) {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      el.textContent = FA.format(Math.round(easeOut(t) * target));
      if (t < 1) frames.add(requestAnimationFrame(step));
    };
    frames.add(requestAnimationFrame(step));
  }

  for (const el of items) {
    // still below the fold: show 0 and count when it arrives. Already in view (or scrolled past): leave the final number.
    if (el.getBoundingClientRect().top >= window.innerHeight) {
      el.textContent = FA.format(0);
      observer.observe(el);
    }
  }
  return () => {
    observer.disconnect();
    for (const f of frames) cancelAnimationFrame(f);
    for (const el of items) el.textContent = FA.format(Number(el.dataset.count));
  };
}
