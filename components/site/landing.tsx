import { env } from "@/lib/env";
import type { LandingData } from "@/lib/content/landing";
import { mediaUrl } from "@/lib/media/paths";
import { CAPS_SCRIPT } from "@/lib/motion/caps-script";
import { parseVariants } from "@/lib/media/variants";
import { resolveConsultHref } from "@/lib/site/links";
import { Hero } from "./hero";
import { JsonLd } from "./json-ld";
import { MotionRoot } from "./motion-root";
import { FALLBACK_SETTINGS } from "./settings-fallback";
import { ClientsSection, ServicesSection, StatsSection, TestimonialSection, WorkSection } from "./sections";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SiteLauncher } from "./site-launcher";
import "./page.css";

/** Absolute URL of the largest fallback image of a cover (for Open Graph and JSON-LD), or undefined. */
export function absoluteCoverUrl(cover: { variants: unknown } | null): string | undefined {
  const variants = parseVariants(cover?.variants);
  if (!variants) return undefined;
  return new URL(mediaUrl(variants.items[variants.items.length - 1].fallback.path), env().SITE_URL).href;
}

/**
 * The landing page, in the order of CLAUDE.md section 6: header, hero, selected work, services + band, stats, testimonial, clients, footer.
 * Sections without real data (work, stats, testimonial, clients) are omitted, never filled with placeholders. Everything here is server
 * markup: the little script there is (the launcher, the clock, the counters, the carousel, the pointer trail) is loaded separately.
 * The primary CTA label is one value from the site settings, used in the header, the hero, the band and the contact form.
 */
export function Landing({ data, preview = false }: { data: LandingData; preview?: boolean }) {
  const brand = data.settings?.brandName ?? FALLBACK_SETTINGS.brandName;
  const cta = data.settings?.primaryCtaLabel ?? FALLBACK_SETTINGS.primaryCtaLabel;
  const { projects, home } = data;
  const hasWork = projects.length > 0;

  const links = [
    ...(hasWork ? [{ label: home.texts.workEyebrow, href: "#work" }] : []),
    ...(data.services.length > 0 ? [{ label: "خدمات", href: "#services" }] : []),
    ...(data.clientLogos.length > 0 ? [{ label: "مشتریان", href: "#clients" }] : []),
  ];

  const sameAs = Object.values(data.settings?.socials ?? {});
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand,
    url: new URL("/", env().SITE_URL).href,
    ...(data.settings?.contactEmail ? { email: data.settings.contactEmail } : {}),
    ...(data.settings?.contactPhone ? { telephone: data.settings.contactPhone } : {}),
    ...(data.settings?.contactAddress ? { address: data.settings.contactAddress } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return (
    <div className="lm-page">
      {/* First thing in <body>: decides the motion set before anything paints (lib/motion/caps-script.ts). */}
      <script dangerouslySetInnerHTML={{ __html: CAPS_SCRIPT }} />
      <a className="lm-skip" href="#main">
        رفتن به محتوای اصلی
      </a>
      <SiteHeader brand={brand} links={links} ctaLabel={cta} overlay />
      <main id="main">
        <Hero home={home} ctaLabel={cta} hasWork={hasWork} />
        <WorkSection projects={projects} texts={home.texts} />
        <ServicesSection services={data.services} texts={home.texts} ctaLabel={cta} />
        <StatsSection stats={home.stats} texts={home.texts} />
        <TestimonialSection testimonial={data.testimonial} />
        <ClientsSection logos={data.clientLogos} />
      </main>
      <SiteFooter
        brand={brand}
        ctaLabel={cta}
        consultHref={resolveConsultHref(data.settings?.consultCtaHref)}
        texts={home.texts}
        links={links}
        services={data.services}
        socials={data.settings?.socials ?? {}}
      />
      <JsonLd data={organization} />
      <MotionRoot />
      {!preview && <SiteLauncher ctaLabel={cta} />}
    </div>
  );
}
