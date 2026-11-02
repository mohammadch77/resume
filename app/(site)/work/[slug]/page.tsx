import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseStudyBody } from "@/components/site/case-study";
import { JsonLd } from "@/components/site/json-ld";
import { absoluteCoverUrl } from "@/components/site/landing";
import { MotionRoot } from "@/components/site/motion-root";
import { ResponsivePicture } from "@/components/site/responsive-picture";
import { FALLBACK_SETTINGS } from "@/components/site/settings-fallback";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { contactTexts } from "@/lib/content/home-defaults";
import { SiteLauncher } from "@/components/site/site-launcher";
import { PillButton, TagChip } from "@/components/site/ui";
import { getPublishedProject } from "@/lib/content/public";
import { getLandingData } from "@/lib/content/landing";
import { env } from "@/lib/env";
import { IMAGE_SIZES } from "@/lib/media/sizes";
import { CONTACT_HREF, resolveConsultHref } from "@/lib/site/links";
import "@/components/site/page.css";

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
  const data = await getLandingData();
  const { settings, home } = data;
  const brand = settings?.brandName ?? FALLBACK_SETTINGS.brandName;
  const cta = settings?.primaryCtaLabel ?? FALLBACK_SETTINGS.primaryCtaLabel;
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
    <div className="lm-root lm-page">
      <SiteHeader brand={brand} brandHref="/" links={HOME_LINKS} ctaLabel={cta} />
      <main id="main" className="lm-shell lm-work">
        <Link className="lm-back" href="/#work">
          همه‌ی نمونه‌کارها
        </Link>
        <article aria-labelledby="case-title" className="lm-work">
          <header>
            {project.tags.length > 0 ? (
              <div className="lm-work__tags">
                {project.tags.map((t) => (
                  <TagChip key={t} tone="dark">
                    {t}
                  </TagChip>
                ))}
              </div>
            ) : null}
            <h1 id="case-title" className="lm-work__title">
              {project.title}
            </h1>
            <p className="lm-work__lead">{project.summary}</p>
          </header>
          {project.cover ? (
            <div className="lm-work__cover">
              <ResponsivePicture asset={project.cover} sizes={IMAGE_SIZES.work} priority placeholder={false} />
            </div>
          ) : null}
          <CaseStudyBody project={project} />
          <div>
            <PillButton href={CONTACT_HREF} variant="accent" arrow="forward">
              {cta}
            </PillButton>
          </div>
        </article>
      </main>
      <SiteFooter
        brand={brand}
        ctaLabel={cta}
        consultHref={resolveConsultHref(settings?.consultCtaHref)}
        texts={home.texts}
        links={HOME_LINKS}
        services={data.services}
        socials={settings?.socials ?? {}}
      />
      <SiteLauncher ctaLabel={cta} contact={contactTexts(home.texts)} />
      <MotionRoot />
      <JsonLd data={creativeWork} />
    </div>
  );
}
