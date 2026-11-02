/**
 * The header's Tehran clock: «۱۴:۳۲ • ۱۰ آبان ۱۴۰۴». Shamsi calendar, Persian digits, Asia/Tehran, whatever the visitor's own time zone is.
 * The page is cached HTML (ISR), so the server can not know the time: the markup holds empty spans of a reserved width (no layout shift) and
 * this fills them at idle and again every minute, on the minute. Plain DOM, no library; returns the teardown.
 */
const TIME = new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tehran" });
const DATE = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Tehran" });

export function startClock(root: HTMLElement): () => void {
  const time = root.querySelector<HTMLElement>("[data-clock-time]");
  const date = root.querySelector<HTMLElement>("[data-clock-date]");
  if (!time || !date) return () => undefined;
  let timer: number | undefined;
  const tick = () => {
    const now = new Date();
    time.textContent = TIME.format(now);
    date.textContent = DATE.format(now);
    timer = window.setTimeout(tick, 60_000 - (now.getTime() % 60_000) + 50);
  };
  tick();
  return () => window.clearTimeout(timer);
}
