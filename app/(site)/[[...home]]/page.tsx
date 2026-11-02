import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absoluteCoverUrl, Landing } from "@/components/site/landing";
import { FALLBACK_SETTINGS } from "@/components/site/settings-fallback";
import { getLandingData } from "@/lib/content/landing";
import { env } from "@/lib/env";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/json-ld";

/**
 * The landing is an optional catch-all on purpose: with no params prerendered it is NOT built at `next build` (the
 * build has no database), is rendered by the first request, cached (ISR) and refreshed by the content tags. Anything
 * below `/` that no other route owns is a 404.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata(): Promise<Metadata> {
  const { settings, projects, home } = await getLandingData();
  const title = settings?.seoTitle ?? settings?.brandName ?? FALLBACK_SETTINGS.brandName;
  const description = settings?.seoDescription ?? settings?.heroSubtitle ?? home.texts.heroDescription;
  // a real project cover when there is one, else our own brand image (never the hero pictures: their rights are not confirmed)
  const image = absoluteCoverUrl(projects[0]?.cover ?? null) ?? new URL(DEFAULT_OG_IMAGE.path, env().SITE_URL).href;
  return {
    metadataBase: new URL(env().SITE_URL),
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { type: "website", locale: "fa_IR", title, description, siteName: settings?.brandName, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function HomePage({ params }: PageProps<"/[[...home]]">) {
  const { home } = await params;
  if (home && home.length > 0) notFound();
  return <Landing data={await getLandingData()} />;
}
