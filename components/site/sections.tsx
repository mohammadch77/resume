import { CtaBand, ICON_NAMES, Metric, ServiceCard, ServiceGrid, Testimonial, type IconName } from "@/components/ds";
import type { LandingData, LandingProject } from "@/lib/content/landing";
import { formatNumber } from "@/lib/format";
import { IMAGE_SIZES } from "@/lib/media/sizes";
import { ResponsivePicture } from "./responsive-picture";

const isIcon = (name: string): name is IconName => (ICON_NAMES as string[]).includes(name);

/** The closing band under the services (copy lives here until it moves to the database; see docs/BACKLOG.md). */
const BAND = {
  title: "پروژه‌تان را با یک گفت‌وگوی کوتاه شروع کنید",
  text: "شرح کوتاهی از نیازتان کافی است؛ مسیر پیشنهادی را با هم بررسی می‌کنیم.",
} as const;

const serviceIndex = (n: number) => (n < 9 ? `۰${formatNumber(n + 1)}` : formatNumber(n + 1));

/** The published services (from the database) and, closing the section, the CTA band with the section's one primary action. */
export function ServicesSection({ services, ctaLabel }: { services: LandingData["services"]; ctaLabel: string }) {
  return (
    <section className="lk-sec" id="services" aria-labelledby="services-title">
      <div className="lk-wrap">
        <h2 className="lk-h2" id="services-title">
          خدمات
        </h2>
        <ServiceGrid>
          {services.map((s, n) => (
            <ServiceCard key={s.id} icon={isIcon(s.iconKey) ? s.iconKey : "layout-grid"} index={serviceIndex(n)} title={s.title}>
              {s.summary}
            </ServiceCard>
          ))}
        </ServiceGrid>
        <CtaBand className="lk-services__band" title={BAND.title} text={BAND.text} ctaLabel={ctaLabel} ctaHref="#contact" />
      </div>
    </section>
  );
}

/** Up to three real figures from published projects. Omitted entirely when there are none (never placeholders). */
export function ResultsSection({ projects }: { projects: LandingProject[] }) {
  const metrics = projects
    .flatMap((p) => p.metrics.map((m) => ({ ...m, source: `پروژه‌ی ${p.title}${p.clientName ? `، ${p.clientName}` : ""}` })))
    .slice(0, 3);
  if (metrics.length === 0) return null;
  return (
    <section className="lk-sec lk-sec--sunken" id="results" aria-labelledby="results-title">
      <div className="lk-wrap">
        <h2 className="lk-h2" id="results-title">
          نتیجه‌ها
        </h2>
        <div className="lk-metrics">
          {metrics.map((m) => (
            <Metric key={`${m.source}-${m.label}`} value={m.value} label={m.label} source={m.source} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** One published quote, with the client's consent (the database refuses to publish without it). Omitted when none. */
export function TestimonialSection({ testimonial }: { testimonial: LandingData["testimonial"] }) {
  if (!testimonial) return null;
  return (
    <section className="lk-sec" aria-label="نظر مشتری">
      <div className="lk-wrap">
        <Testimonial quote={`«${testimonial.quote}»`} name={testimonial.authorName} role={testimonial.authorRole ?? undefined} />
      </div>
    </section>
  );
}

/** Real logos only. Omitted when no client agreed to be shown (no dashed «[لوگو]» frames in production). */
export function ClientsSection({ logos }: { logos: LandingData["clientLogos"] }) {
  if (logos.length === 0) return null;
  return (
    <section className="lk-sec lk-sec--flush" id="clients" aria-labelledby="clients-title">
      <div className="lk-wrap">
        <h2 className="lk-h2 lk-h2--small" id="clients-title">
          مشتریان
        </h2>
        <ul className="lk-logos lk-list">
          {logos.map((c) => (
            <li className="lk-logo" key={c.id}>
              <ResponsivePicture asset={c.logo} sizes={IMAGE_SIZES.logo} alt={c.name} className="lk-logo__img" />
            </li>
          ))}
        </ul>
        <p className="gw-visually-hidden">{formatNumber(logos.length)} مشتری</p>
      </div>
    </section>
  );
}
