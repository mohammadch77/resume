import { Button, CoverArt, CropFrame } from "@/components/ds";
import type { LandingProject } from "@/lib/content/landing";
import { formatNumber } from "@/lib/format";
import { IMAGE_SIZES } from "@/lib/media/sizes";
import { CONTACT_HREF } from "@/lib/site/links";
import { coverNode } from "./cover";

type Props = { title: string; subtitle: string | null; ctaLabel: string; projects: LandingProject[]; hasWork: boolean };

/**
 * Hero: outcome-led headline, the one primary CTA, a secondary link to the work, a proof line made only of real
 * numbers, and two overlapping crop-marked covers over one lapis block. The covers are the first two published
 * projects' images (ResponsivePicture); without images the design system's placeholder art is used.
 */
export function Hero({ title, subtitle, ctaLabel, projects, hasWork }: Props) {
  const front = coverNode(projects[0]?.cover ?? null, IMAGE_SIZES.hero, { priority: true, decorative: true });
  const back = coverNode(projects[1]?.cover ?? projects[0]?.cover ?? null, IMAGE_SIZES.hero, { decorative: true });
  return (
    <section className="lk-wrap lk-hero" id="top" aria-labelledby="hero-title">
      <div>
        <h1 id="hero-title" data-enter="0">
          {title}
        </h1>
        {subtitle && (
          <p className="lk-lead" data-enter="1">
            {subtitle}
          </p>
        )}
        <div className="lk-actions" data-enter="2">
          <Button href={CONTACT_HREF}>{ctaLabel}</Button>
          {hasWork && (
            <Button variant="secondary" href="#work">
              مشاهده نمونه‌کارها
            </Button>
          )}
        </div>
        {projects.length > 0 && <p className="lk-proof">{formatNumber(projects.length)} نمونه‌کار منتشرشده</p>}
      </div>
      <div className="lk-art" aria-hidden="true">
        <div className="lk-art__block" />
        <div className="lk-art__a" data-enter="slide">
          <CropFrame>{back ? <div className="gw-cover">{back}</div> : <CoverArt art={3} />}</CropFrame>
        </div>
        <div className="lk-art__b" data-enter="slide">
          <CropFrame>{front ? <div className="gw-cover">{front}</div> : <CoverArt art={1} sample />}</CropFrame>
        </div>
      </div>
    </section>
  );
}
