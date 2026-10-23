import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absoluteCoverUrl, Landing } from "@/components/site/landing";
import { FALLBACK_SETTINGS } from "@/components/site/process";
import { getLandingData } from "@/lib/content/landing";
import { env } from "@/lib/env";

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
  const { settings, projects } = await getLandingData();
  const title = settings?.seoTitle ?? settings?.brandName ?? FALLBACK_SETTINGS.brandName;
  const description = settings?.seoDescription ?? settings?.heroSubtitle ?? undefined;
  const image = absoluteCoverUrl(projects[0]?.cover ?? null);
  return {
    metadataBase: new URL(env().SITE_URL),
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { type: "website", locale: "fa_IR", title, description, siteName: settings?.brandName, ...(image ? { images: [image] } : {}) },
  };
}

export default async function HomePage({ params }: PageProps<"/[[...home]]">) {
  const { home } = await params;
  if (home && home.length > 0) notFound();
  return <Landing data={await getLandingData()} />;
}
