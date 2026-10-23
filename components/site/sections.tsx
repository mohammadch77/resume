import { Icon, ICON_NAMES, Metric, Testimonial, type IconName } from "@/components/ds";
import type { LandingData, LandingProject } from "@/lib/content/landing";
import { formatNumber } from "@/lib/format";
import { IMAGE_SIZES } from "@/lib/media/sizes";
import { PROCESS_STEPS } from "./process";
import { ResponsivePicture } from "./responsive-picture";

const isIcon = (name: string): name is IconName => (ICON_NAMES as string[]).includes(name);
const PERSIAN_STEP = "۱۲۳۴۵۶۷۸۹";

export function ServicesSection({ services }: { services: LandingData["services"] }) {
  return (
    <section className="lk-sec" id="services" aria-labelledby="services-title">
      <div className="lk-wrap">
        <h2 className="lk-h2" id="services-title">
          خدمات
        </h2>
        <ul className="lk-cols lk-list">
          {services.map((s) => (
            <li className="lk-col" key={s.id}>
              {isIcon(s.iconKey) && <Icon name={s.iconKey} />}
              <h3>{s.title}</h3>
              <p>{s.summary}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ProcessSection() {
  return (
    <section className="lk-sec lk-sec--flush" id="process" aria-labelledby="process-title">
      <div className="lk-wrap">
        <h2 className="lk-h2" id="process-title">
          روش کار
        </h2>
        <ol className="lk-cols lk-list">
          {PROCESS_STEPS.map((s, n) => (
            <li className="lk-col" key={s.title}>
              <span className="lk-step-n" aria-hidden="true">
                {PERSIAN_STEP[n]}
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
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
