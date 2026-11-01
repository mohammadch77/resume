import { Eyebrow } from "./eyebrow";

export type Stat = { value: number; suffix: string; label: string };

const faNumber = new Intl.NumberFormat("fa-IR", { useGrouping: false });

/**
 * The ink panel of figures. Every number is in the HTML as its final value (no JavaScript, crawlers, reduced motion all see it);
 * the lazily loaded engine may count it up from `data-count`. Renders nothing without stats: no empty panel.
 */
export function StatsPanel({ eyebrow, title, stats }: { eyebrow: string; title: string; stats: Stat[] }) {
  if (stats.length === 0) return null;
  return (
    <section className="lm-stats" aria-labelledby="lm-stats-title">
      <Eyebrow tone="light">{eyebrow}</Eyebrow>
      <h2 id="lm-stats-title" className="lm-stats__title">
        {title}
      </h2>
      <ul className="lm-stats__grid">
        {stats.map((s) => (
          <li key={s.label} className="lm-stats__item">
            <span className="lm-stats__figure">
              {/* number and suffix are one isolated left-to-right unit, so «۱۵۰+» reads like «150+» (a bare "+" at the end of RTL text lands on the wrong side) */}
              <span className="lm-stats__num" dir="ltr">
                <span data-count={s.value}>{faNumber.format(s.value)}</span>
                {s.suffix}
              </span>
            </span>
            <span className="lm-stats__label">{s.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
