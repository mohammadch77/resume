import type { Metadata } from "next";
import { Navbar } from "@/components/ds";
import { ContactBody } from "@/components/site/contact-body";
import { FALLBACK_SETTINGS } from "@/components/site/settings-fallback";
import { SiteFooter } from "@/components/site/site-footer";
import { getLandingData } from "@/lib/content/landing";
import { env } from "@/lib/env";
import { CONTACT_HREF, resolveConsultHref } from "@/lib/site/links";
import "@/components/site/landing.css";

/**
 * The contact form as a page of its own: where the CTA links lead without JavaScript (with it, they open the same form in a
 * dialog over the page instead). Not indexed and not in the sitemap: it is a form, not content.
 */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getLandingData();
  const cta = settings?.primaryCtaLabel ?? FALLBACK_SETTINGS.primaryCtaLabel;
  return {
    metadataBase: new URL(env().SITE_URL),
    title: `${cta} · ${settings?.brandName ?? FALLBACK_SETTINGS.brandName}`,
    robots: { index: false, follow: true },
  };
}

const HOME_LINKS = [
  { label: "نمونه‌کارها", href: "/#work" },
  { label: "خدمات", href: "/#services" },
];

export default async function ContactPage() {
  const { settings } = await getLandingData();
  const brand = settings?.brandName ?? FALLBACK_SETTINGS.brandName;
  const cta = settings?.primaryCtaLabel ?? FALLBACK_SETTINGS.primaryCtaLabel;
  return (
    <>
      <header className="lk-navwrap">
        <Navbar brand={brand} brandHref="/" links={HOME_LINKS} ctaLabel={cta} ctaHref={CONTACT_HREF} />
      </header>
      <main id="main" className="lk-sec">
        <ContactBody
          settings={{ contactPhone: settings?.contactPhone ?? null, contactEmail: settings?.contactEmail ?? null, contactAddress: settings?.contactAddress ?? null, socials: settings?.socials ?? {} }}
          ctaLabel={cta}
        />
      </main>
      <SiteFooter brand={brand} ctaLabel={cta} consultHref={resolveConsultHref(settings?.consultCtaHref)} />
    </>
  );
}
