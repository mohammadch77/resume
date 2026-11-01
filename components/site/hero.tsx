import { Fragment } from "react";
import type { HomeData } from "@/lib/content/landing";
import { CONTACT_HREF } from "@/lib/site/links";
import { IMAGE_SIZES } from "@/lib/media/sizes";
import { ResponsivePicture } from "./responsive-picture";
import { BrandMark, Eyebrow, PillButton, StarIcon } from "./ui";
import "./hero.css";

const faDigit = new Intl.NumberFormat("fa-IR", { useGrouping: false });

/**
 * The hero: the text (all of it from the database, home_content) beside one big monitor with no background. The monitor is two
 * aligned transparent pictures: the sketch is the base picture (the LCP, so it is eager, fetchpriority=high, with its size from the
 * database), and the bold one is only a URL on the host element: lib/motion/hero-trail.ts fetches it after the first pointer
 * movement (or at idle) and paints it under the cursor inside the monitor's silhouette, on a desktop with a fine pointer only.
 * Without the two pictures the hero is typography only (a large headline and the arch mark); both layouts are complete pages.
 */
export function Hero({ home, ctaLabel, hasWork }: { home: HomeData; ctaLabel: string; hasWork: boolean }) {
  const t = home.texts;
  const img = home.heroImages;
  const { left, center, right } = home.status;
  const hasStatus = Boolean(left || center || right);
  return (
    <>
      <section className={`lm-root lm-hero${img ? "" : " lm-hero--type"}`} id="home" aria-labelledby="lm-hero-title">
        <div className="lm-shell lm-hero__grid">
          <div className="lm-hero__text">
            <p className="lm-hero__eyebrow" data-enter="0">
              <Eyebrow>{t.heroEyebrow}</Eyebrow>
            </p>
            <h1 id="lm-hero-title" className="lm-hero__title">
              {[t.heroLine1, t.heroLine2, t.heroLine3].map((line, i) => (
                <Fragment key={i}>
                  {i > 0 ? " " : null}
                  <span className="lm-hero__line" data-enter={i + 1}>
                    {line}
                  </span>
                </Fragment>
              ))}
            </h1>
            <p className="lm-hero__lead" data-enter="2">
              {t.heroDescription}
            </p>
            {home.rating ? (
              <p className="lm-hero__rating" data-enter="3">
                <span role="img" aria-label={`امتیاز ${faDigit.format(home.rating.score)} از ${faDigit.format(5)}`} className="lm-hero__stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <StarIcon key={n} size="1em" strokeWidth={0} fill="currentColor" className={n <= home.rating!.score ? "" : "lm-hero__star--off"} aria-hidden="true" />
                  ))}
                </span>
                <span>{home.rating.label}</span>
              </p>
            ) : null}
            <div className="lm-hero__actions" data-enter="3">
              <PillButton href={CONTACT_HREF} variant="accent" arrow="forward">
                {ctaLabel}
              </PillButton>
              {hasWork ? (
                <PillButton href="#work" variant="outline">
                  {t.heroSecondaryCtaLabel}
                </PillButton>
              ) : null}
            </div>
          </div>
          {img ? (
            <div className="lm-monitor" data-trail-src={img.trailSrc} data-trail-mask={img.maskSrc}>
              <ResponsivePicture asset={img.base} sizes={IMAGE_SIZES.heroMonitor} priority placeholder={false} className="lm-monitor__img" />
            </div>
          ) : (
            <span className="lm-hero__mark" aria-hidden="true">
              <BrandMark />
            </span>
          )}
        </div>
        {hasStatus ? (
          <div className="lm-shell">
            <p className="lm-hero__status">
              {left ? <span>{left}</span> : null}
              {center ? <span className="lm-hero__status-mid">{center}</span> : null}
              {right ? <span>{right}</span> : null}
            </p>
          </div>
        ) : null}
      </section>
    </>
  );
}
