import type { MetadataRoute } from "next";
import { getLandingData } from "@/lib/content/landing";
import { env } from "@/lib/env";

// Read at request time (cached by tag): the build has no database.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = new URL(env().SITE_URL);
  const { projects } = await getLandingData();
  return [
    { url: new URL("/", base).href, changeFrequency: "weekly", priority: 1 },
    ...projects.map((p) => ({ url: new URL(`/work/${p.slug}`, base).href, lastModified: p.publishedAt ?? undefined, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
