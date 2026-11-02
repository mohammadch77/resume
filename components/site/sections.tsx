import type { HomeData, LandingData, LandingProject } from "@/lib/content/landing";
import { formatNumber } from "@/lib/format";
import { IMAGE_SIZES } from "@/lib/media/sizes";
import { CONTACT_HREF } from "@/lib/site/links";
import { ResponsivePicture } from "./responsive-picture";
import { Eyebrow, PillButton, PortfolioCard, ServiceRow, StatsPanel } from "./ui";

const faYear = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", timeZone: "Asia/Tehran" });

/** Selected Work: the published projects as a two-column grid of ink cards. Each card is a real link to /work/<slug>; with JavaScript a click opens the case study in a dialog (site-launcher.tsx). */
export function WorkSection({ projects, texts }: { projects: LandingProject[]; texts: HomeData["texts"] }) {
  if (projects.length === 0) return null;
  return (
    <section className="lm-sec lm-sec--tight" id="work" aria-labelledby="work-title">
      <div className="lm-shell">
        <div className="lm-sec__head--center">
          <Eyebrow bordered>{texts.workEyebrow}</Eyebrow>
          <h2 className="lm-sec__title" id="work-title">
            {texts.workTitle}
          </h2>
        </div>
        <ul className="lm-work__grid">
          {projects.map((p, i) => (
            <li key={p.slug}>
              <PortfolioCard
                href={`/work/${p.slug}`}
                title={p.title}
                description={p.summary}
                category={p.industry ?? p.serviceTitles[0] ?? "پروژه"}
                year={p.completedOn ? faYear.format(new Date(p.completedOn)) : undefined}
                tags={p.tags.slice(0, 3)}
                cover={p.cover ? <ResponsivePicture asset={p.cover} sizes={IMAGE_SIZES.card} alt="" priority={false} placeholder={false} className="lm-card__img" /> : undefined}
                linkProps={{ "data-case": p.slug, "data-case-title": p.title, "data-index": String(i) }}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The about statement from the home content: a bold lead and a quieter rest. With both empty the section is absent. */
export function AboutSection({ texts }: { texts: HomeData["texts"] }) {
  const lead = texts.aboutLead.trim();
  const rest = texts.aboutRest.trim();
  if (!lead && !rest) return null;
  return (
    <section className="lm-sec lm-sec--tight" id="about" aria-labelledby="about-title">
      <div className="lm-shell">
        {texts.aboutEyebrow.trim() ? <Eyebrow bordered>{texts.aboutEyebrow}</Eyebrow> : null}
        <p className="lm-about" id="about-title">
          {lead}
          {lead && rest ? " " : ""}
          <span className="lm-about__rest">{rest}</span>
        </p>
      </div>
    </section>
  );
}

/** The published services (from the database) as a list of rows, and the band that closes the section: the section's one primary action. */
export function ServicesSection({ services, texts, ctaLabel }: { services: LandingData["services"]; texts: HomeData["texts"]; ctaLabel: string }) {
  return (
    <section className="lm-sec" id="services" aria-labelledby="services-title">
      <div className="lm-shell">
        <Eyebrow>{texts.servicesEyebrow}</Eyebrow>
        <h2 className="lm-sec__title" id="services-title">
          {texts.servicesTitle}
        </h2>
        {services.length > 0 ? (
          <ul>
            {services.map((s, n) => (
              <ServiceRow key={s.id} index={n + 1} title={s.title} summary={s.summary} />
            ))}
          </ul>
        ) : null}
        <div className="lm-band">
          <div>
            <h3 className="lm-band__title">{texts.bandTitle}</h3>
            <p className="lm-band__text">{texts.bandText}</p>
          </div>
          <PillButton href={CONTACT_HREF} variant="accent" arrow="forward">
            {ctaLabel}
          </PillButton>
        </div>
      </div>
    </section>
  );
}

/** The figures the owner entered in the admin and published (never a «نمونه» one). Absent when there are none: no empty panel. */
export function StatsSection({ stats, texts }: { stats: HomeData["stats"]; texts: HomeData["texts"] }) {
  if (stats.length === 0) return null;
  return (
    <section className="lm-statsec" id="stats">
      <div className="lm-shell">
        <StatsPanel eyebrow={texts.statsEyebrow} title={texts.statsTitle} stats={stats.map((s) => ({ value: s.value, suffix: s.suffix, label: s.label }))} />
      </div>
    </section>
  );
}

/** One published quote, with the client's consent (the database refuses to publish without it). Omitted when none. */
export function TestimonialSection({ testimonial }: { testimonial: LandingData["testimonial"] }) {
  if (!testimonial) return null;
  return (
    <section className="lm-sec lm-sec--tight" aria-label="نظر مشتری">
      <div className="lm-shell">
        <figure className="lm-quote">
          <blockquote className="lm-quote__text">«{testimonial.quote}»</blockquote>
          <figcaption className="lm-quote__who">
            {testimonial.authorName}
            {testimonial.authorRole ? <span className="lm-quote__role">{testimonial.authorRole}</span> : null}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/** Real logos only. Omitted when no client agreed to be shown (no placeholder frames in production). */
export function ClientsSection({ logos }: { logos: LandingData["clientLogos"] }) {
  if (logos.length === 0) return null;
  return (
    <section className="lm-sec lm-sec--tight" id="clients" aria-labelledby="clients-title">
      <div className="lm-shell">
        <Eyebrow>مشتریان</Eyebrow>
        <h2 className="lm-sec__title" id="clients-title">
          برندهایی که با ما کار کرده‌اند
        </h2>
        <ul className="lm-logos">
          {logos.map((c) => (
            <li key={c.id}>
              <ResponsivePicture asset={c.logo} sizes={IMAGE_SIZES.logo} alt={c.name} placeholder={false} className="lm-logo__img" />
            </li>
          ))}
        </ul>
        <p className="gw-visually-hidden">{formatNumber(logos.length)} مشتری</p>
      </div>
    </section>
  );
}
