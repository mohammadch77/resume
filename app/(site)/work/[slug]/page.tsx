import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button, Chip, CoverArt, CropFrame, Navbar } from "@/components/ds";
import { CaseStudyExtra } from "@/components/site/case-study";
import { ContactLauncher } from "@/components/site/contact-launcher";
import { coverNode } from "@/components/site/cover";
import { JsonLd } from "@/components/site/json-ld";
import { absoluteCoverUrl } from "@/components/site/landing";
import { FALLBACK_SETTINGS } from "@/components/site/settings-fallback";
import { SiteFooter } from "@/components/site/site-footer";
import { getPublishedProject } from "@/lib/content/public";
import { getLandingData } from "@/lib/content/landing";
import { env } from "@/lib/env";
import { IMAGE_SIZES } from "@/lib/media/sizes";
import { CONTACT_HREF, resolveConsultHref } from "@/lib/site/links";
import "@/components/site/landing.css";

/**
 * ISR: rendered by the first request, cached, and refreshed when an admin action expires a content tag. Nothing is
 * prerendered at build time (the build has no database); a project that is unpublished or deleted becomes a 404 at once.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) return {};
  const { settings } = await getLandingData();
  const title = project.seoTitle ?? project.title;
  const description = project.seoDescription ?? project.summary;
  const image = absoluteCoverUrl(project.cover);
  return {
    metadataBase: new URL(env().SITE_URL),
    title: `${title} · ${settings?.brandName ?? FALLBACK_SETTINGS.brandName}`,
    description,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: { type: "article", locale: "fa_IR", title, description, ...(image ? { images: [image] } : {}) },
  };
}

const HOME_LINKS = [
  { label: "نمونه‌کارها", href: "/#work" },
  { label: "خدمات", href: "/#services" },
];

export default async function WorkPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) notFound();
  const { settings } = await getLandingData();
  const brand = settings?.brandName ?? FALLBACK_SETTINGS.brandName;
  const cta = settings?.primaryCtaLabel ?? FALLBACK_SETTINGS.primaryCtaLabel;
  const cover = coverNode(project.cover, IMAGE_SIZES.work, { priority: true });
  const image = absoluteCoverUrl(project.cover);

  const creativeWork = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    url: new URL(`/work/${project.slug}`, env().SITE_URL).href,
    inLanguage: "fa",
    creator: { "@type": "Organization", name: brand, url: new URL("/", env().SITE_URL).href },
    ...(image ? { image } : {}),
    ...(project.completedOn ? { dateCreated: project.completedOn } : {}),
    ...(project.publishedAt ? { datePublished: project.publishedAt } : {}),
    ...(project.tags.length > 0 ? { keywords: project.tags.join("، ") } : {}),
    ...(project.liveUrl ? { sameAs: project.liveUrl } : {}),
  };

  return (
    <>
      <header className="lk-navwrap">
        <Navbar brand={brand} brandHref="/" links={HOME_LINKS} ctaLabel={cta} ctaHref={CONTACT_HREF} />
      </header>
      <main id="main" className="lk-wrap lk-work">
        <Link className="lk-back" href="/#work">
          همه‌ی نمونه‌کارها
        </Link>
        <article className="lk-work" aria-labelledby="case-title">
          <header>
            {project.tags.length > 0 && (
              <div className="gw-chip-row">
                {project.tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>
            )}
            <h1 id="case-title">{project.title}</h1>
            <p className="lk-lead">{project.summary}</p>
          </header>
          <CropFrame>{cover ? <div className="gw-cover">{cover}</div> : <CoverArt art={1} />}</CropFrame>
          <div className="lk-work__cols">
            <section className="gw-modal__col">
              <h2 className="lk-case__h">چالش</h2>
              <p>{project.challenge || "—"}</p>
            </section>
            <section className="gw-modal__col">
              <h2 className="lk-case__h">راه‌حل</h2>
              <p>{project.solution || "—"}</p>
            </section>
            <section className="gw-modal__col">
              <h2 className="lk-case__h">نتیجه</h2>
              <p>{project.outcome || "—"}</p>
            </section>
          </div>
          <CaseStudyExtra project={project} />
          <div>
            <Button href={CONTACT_HREF}>{cta}</Button>
          </div>
        </article>
      </main>
      <SiteFooter brand={brand} ctaLabel={cta} consultHref={resolveConsultHref(settings?.consultCtaHref)} />
      <ContactLauncher ctaLabel={cta} />
      <JsonLd data={creativeWork} />
    </>
  );
}
