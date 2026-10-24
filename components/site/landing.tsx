import type { NavLink } from "@/components/ds";
import { env } from "@/lib/env";
import type { LandingData } from "@/lib/content/landing";
import { mediaUrl } from "@/lib/media/paths";
import { IMAGE_SIZES } from "@/lib/media/sizes";
import { CAPS_SCRIPT } from "@/lib/motion/caps-script";
import { parseVariants } from "@/lib/media/variants";
import { CaseStudyExtra } from "./case-study";
import { ContactSection } from "./contact-section";
import { coverNode } from "./cover";
import { Hero } from "./hero";
import { JsonLd } from "./json-ld";
import { MotionRoot } from "./motion-root";
import { FALLBACK_SETTINGS } from "./process";
import { ClientsSection, ProcessSection, ResultsSection, ServicesSection, TestimonialSection } from "./sections";
import { SiteFooter } from "./site-footer";
import { SiteNavbar } from "./site-navbar";
import { WorkExplorer, type WorkCard } from "./work-explorer";
import "./landing.css";

/** Absolute URL of the largest fallback image of a cover (for Open Graph and JSON-LD), or undefined. */
export function absoluteCoverUrl(cover: { variants: unknown } | null): string | undefined {
  const variants = parseVariants(cover?.variants);
  if (!variants) return undefined;
  return new URL(mediaUrl(variants.items[variants.items.length - 1].fallback.path), env().SITE_URL).href;
}

/**
 * The landing page, in the order of CLAUDE.md section 6: navbar, hero, selected work, services, how we work, results,
 * testimonial, clients, contact, footer. Sections without real data (work, results, testimonial, clients) are omitted,
 * never filled with placeholders. The primary CTA label is one value from the site settings, used in the navbar, the hero
 * and the contact form.
 */
export function Landing({ data }: { data: LandingData }) {
  const brand = data.settings?.brandName ?? FALLBACK_SETTINGS.brandName;
  const cta = data.settings?.primaryCtaLabel ?? FALLBACK_SETTINGS.primaryCtaLabel;
  const heroTitle = data.settings?.heroTitle ?? FALLBACK_SETTINGS.heroTitle;
  const { projects } = data;
  const hasWork = projects.length > 0;

  const links: NavLink[] = [
    ...(hasWork ? [{ label: "نمونه‌کارها", href: "#work" }] : []),
    ...(data.services.length > 0 ? [{ label: "خدمات", href: "#services" }] : []),
    { label: "روش کار", href: "#process" },
    ...(data.clientLogos.length > 0 ? [{ label: "مشتریان", href: "#clients" }] : []),
  ];

  const cards: WorkCard[] = projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    tags: p.tags.slice(0, 4),
    industry: p.industry,
    cover: coverNode(p.cover, IMAGE_SIZES.card),
    modalCover: coverNode(p.cover, IMAGE_SIZES.modal),
    challenge: p.challenge,
    solution: p.solution,
    outcome: p.outcome,
    extra: <CaseStudyExtra project={p} />,
  }));
  const filters = [...new Set(projects.map((p) => p.industry).filter((n): n is string => Boolean(n)))];

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
    <>
      {/* First thing in <body>: decides the motion set before anything paints (lib/motion/caps-script.ts). */}
      <script dangerouslySetInnerHTML={{ __html: CAPS_SCRIPT }} />
      <a className="lk-skip" href="#main">
        رفتن به محتوای اصلی
      </a>
      <header className="lk-navwrap">
        <SiteNavbar brand={brand} links={links} ctaLabel={cta} />
      </header>
      <main id="main">
        <Hero title={heroTitle} subtitle={data.settings?.heroSubtitle ?? null} ctaLabel={cta} projects={projects} hasWork={hasWork} />
        {hasWork && (
          <section className="lk-sec lk-sec--sunken" id="work" aria-label="نمونه‌کارهای منتخب">
            <WorkExplorer cards={cards} filters={filters} ctaLabel={cta} />
          </section>
        )}
        {data.services.length > 0 && <ServicesSection services={data.services} />}
        <ProcessSection />
        <ResultsSection projects={projects} />
        <TestimonialSection testimonial={data.testimonial} />
        <ClientsSection logos={data.clientLogos} />
        <ContactSection
          settings={{ contactPhone: data.settings?.contactPhone ?? null, contactEmail: data.settings?.contactEmail ?? null, contactAddress: data.settings?.contactAddress ?? null, socials: data.settings?.socials ?? {} }}
          ctaLabel={cta}
        />
      </main>
      <SiteFooter brand={brand} />
      <JsonLd data={organization} />
      <MotionRoot />
    </>
  );
}
