/**
 * The hero's small carousel card. The HTML holds every card (the first is shown); this wires the previous/next buttons and the dots and
 * un-hides the buttons (data-ready). Clicking the card itself advances, like the reference. The change of card is a CSS transition of
 * transform and opacity (only under data-motion). Plain DOM; returns the teardown.
 */
export function startCarousel(root: HTMLElement): () => void {
  const items = [...root.querySelectorAll<HTMLElement>(".lm-hcard__item")];
  const dots = [...root.querySelectorAll<HTMLElement>(".lm-hcard__dot")];
  if (items.length < 2) return () => undefined;
  let index = 0;
  const show = (next: number) => {
    index = (next + items.length) % items.length;
    items.forEach((el, i) => {
      el.dataset.active = String(i === index);
      if (i === index) el.removeAttribute("aria-hidden");
      else el.setAttribute("aria-hidden", "true");
    });
    dots.forEach((el, i) => (el.dataset.active = String(i === index)));
  };
  const prev = root.querySelector<HTMLElement>("[data-carousel-prev]");
  const next = root.querySelector<HTMLElement>("[data-carousel-next]");
  const onPrev = () => show(index - 1);
  const onNext = () => show(index + 1);
  const onCard = (e: MouseEvent) => {
    if (e.target instanceof Element && e.target.closest("button")) return;
    show(index + 1);
  };
  prev?.addEventListener("click", onPrev);
  next?.addEventListener("click", onNext);
  root.addEventListener("click", onCard);
  root.setAttribute("data-ready", "");
  return () => {
    prev?.removeEventListener("click", onPrev);
    next?.removeEventListener("click", onNext);
    root.removeEventListener("click", onCard);
    root.removeAttribute("data-ready");
  };
}
