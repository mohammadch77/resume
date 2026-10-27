import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import type { Db } from "@/lib/db/client";
import { getDb } from "@/lib/db/client";
import { clients, industries, mediaAssets, projectMedia, projectMetrics, projects, projectServices, projectTech, services, siteSettings, techTags, testimonials } from "@/lib/db/schema";
import { CONTENT_TAGS } from "./cache";
import { isSample, isSampleText } from "./sample";

/** What `ResponsivePicture` needs, as plain JSON. */
export type PictureData = { altFa: string | null; width: number | null; height: number | null; dominantColor: string | null; variants: unknown };

export type GalleryItem =
  | { id: string; kind: "image"; caption: string | null; picture: PictureData }
  | { id: string; kind: "video"; caption: string | null; poster: PictureData; video: { originalPath: string; mime: string; altFa: string | null } };

export type LandingProject = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  challenge: string;
  solution: string;
  outcome: string;
  completedOn: string | null;
  liveUrl: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  industry: string | null;
  /** Industry first, then technologies; at most four are shown on a card. */
  tags: string[];
  serviceTitles: string[];
  cover: PictureData | null;
  gallery: GalleryItem[];
  metrics: Array<{ label: string; value: string }>;
  /** Only when the client agreed to be named (clients.show_name_publicly). */
  clientName: string | null;
};

export type LandingSettings = {
  brandName: string;
  heroTitle: string;
  /** null when the stored subtitle is still demo text. */
  heroSubtitle: string | null;
  primaryCtaLabel: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  /** tel:, https:// or #anchor for the footer link; null = scroll to the contact form. */
  consultCtaHref: string | null;
  socials: Record<string, string>;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type LandingData = {
  settings: LandingSettings | null;
  projects: LandingProject[];
  services: Array<{ id: string; title: string; summary: string; iconKey: string }>;
  testimonial: { quote: string; authorName: string; authorRole: string | null } | null;
  clientLogos: Array<{ id: string; name: string; logo: PictureData }>;
};

const MAX_PROJECTS = 60;

const picture = (m: typeof mediaAssets.$inferSelect): PictureData => ({ altFa: m.altFa, width: m.width, height: m.height, dominantColor: m.dominantColor, variants: m.variants });
const clean = (names: Array<string | null | undefined>): string[] => names.filter((n): n is string => Boolean(n) && !isSampleText(n));

/**
 * Everything the landing and the case-study pages show, read in one go. This is the single place where demo content is
 * kept away from visitors: a row whose title or summary starts with «نمونه» is dropped here, whatever its status is, so
 * even a sample row published by direct SQL never renders. Only published, non-deleted rows are read at all.
 */
export async function loadLandingData(db: Db): Promise<LandingData> {
  const [settingsRow] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
  const settings: LandingSettings | null = settingsRow
    ? {
        brandName: settingsRow.brandName,
        heroTitle: settingsRow.heroTitle,
        heroSubtitle: isSampleText(settingsRow.heroSubtitle) ? null : settingsRow.heroSubtitle,
        primaryCtaLabel: settingsRow.primaryCtaLabel,
        contactPhone: settingsRow.contactPhone,
        contactEmail: settingsRow.contactEmail,
        contactAddress: settingsRow.contactAddress,
        consultCtaHref: settingsRow.consultCtaHref,
        socials: settingsRow.socials,
        seoTitle: settingsRow.seoTitle,
        seoDescription: settingsRow.seoDescription,
      }
    : null;

  const projectRows = (
    await db
      .select()
      .from(projects)
      .where(and(eq(projects.status, "published"), isNull(projects.deletedAt)))
      .orderBy(desc(projects.isFeatured), asc(projects.sortOrder), desc(projects.publishedAt), asc(projects.id))
      .limit(MAX_PROJECTS)
  ).filter((p) => !isSample(p.title, p.summary));
  const ids = projectRows.map((p) => p.id);

  const [industryRows, tagRows, serviceLinks, mediaLinks, metricRows, clientRows] = ids.length
    ? await Promise.all([
        db.select({ id: industries.id, name: industries.name }).from(industries).where(isNull(industries.deletedAt)),
        db
          .select({ projectId: projectTech.projectId, name: techTags.name })
          .from(projectTech)
          .innerJoin(techTags, eq(techTags.id, projectTech.techTagId))
          .where(and(inArray(projectTech.projectId, ids), isNull(techTags.deletedAt)))
          .orderBy(asc(techTags.name)),
        db
          .select({ projectId: projectServices.projectId, title: services.title })
          .from(projectServices)
          .innerJoin(services, eq(services.id, projectServices.serviceId))
          .where(and(inArray(projectServices.projectId, ids), eq(services.status, "published"), isNull(services.deletedAt)))
          .orderBy(asc(services.sortOrder)),
        db.select().from(projectMedia).where(inArray(projectMedia.projectId, ids)).orderBy(asc(projectMedia.position)),
        db.select().from(projectMetrics).where(inArray(projectMetrics.projectId, ids)).orderBy(asc(projectMetrics.position)),
        db.select({ id: clients.id, name: clients.name, show: clients.showNamePublicly }).from(clients).where(isNull(clients.deletedAt)),
      ])
    : [[], [], [], [], [], []];

  const mediaIds = [...new Set([...projectRows.map((p) => p.coverMediaId), ...mediaLinks.map((m) => m.mediaId)].filter((v): v is string => Boolean(v)))];
  const mediaRows = mediaIds.length ? await db.select().from(mediaAssets).where(inArray(mediaAssets.id, mediaIds)) : [];
  const posterIds = mediaRows.map((m) => m.posterMediaId).filter((v): v is string => Boolean(v));
  const posterRows = posterIds.length ? await db.select().from(mediaAssets).where(inArray(mediaAssets.id, posterIds)) : [];
  const media = new Map([...mediaRows, ...posterRows].map((m) => [m.id, m]));
  const industryById = new Map(industryRows.map((i) => [i.id, i.name]));
  const clientById = new Map(clientRows.map((c) => [c.id, c]));

  const landingProjects: LandingProject[] = projectRows.map((p) => {
    const gallery: GalleryItem[] = [];
    for (const link of mediaLinks.filter((l) => l.projectId === p.id)) {
      const asset = media.get(link.mediaId);
      if (!asset) continue;
      if (asset.kind === "image") gallery.push({ id: link.id, kind: "image", caption: link.caption, picture: picture(asset) });
      else {
        const poster = asset.posterMediaId ? media.get(asset.posterMediaId) : undefined;
        if (poster) gallery.push({ id: link.id, kind: "video", caption: link.caption, poster: picture(poster), video: { originalPath: asset.originalPath, mime: asset.mime, altFa: asset.altFa } });
      }
    }
    const cover = p.coverMediaId ? media.get(p.coverMediaId) : undefined;
    const client = p.clientId ? clientById.get(p.clientId) : undefined;
    const industry = industryById.get(p.industryId) ?? null;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      challenge: p.challenge,
      solution: p.solution,
      outcome: p.outcome,
      completedOn: p.completedOn,
      liveUrl: p.liveUrl,
      isFeatured: p.isFeatured,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      industry: industry && !isSampleText(industry) ? industry : null,
      tags: clean([industry, ...tagRows.filter((t) => t.projectId === p.id).map((t) => t.name)]),
      serviceTitles: clean(serviceLinks.filter((s) => s.projectId === p.id).map((s) => s.title)),
      cover: cover && cover.kind === "image" ? picture(cover) : null,
      gallery,
      metrics: metricRows.filter((m) => m.projectId === p.id).map((m) => ({ label: m.label, value: m.valueText })),
      clientName: client?.show && !isSampleText(client.name) ? client.name : null,
    };
  });

  const serviceRows = (await db.select().from(services).where(and(eq(services.status, "published"), isNull(services.deletedAt))).orderBy(asc(services.sortOrder), asc(services.createdAt))).filter((s) => !isSample(s.title, s.summary));

  const [testimonialRow] = (
    await db
      .select()
      .from(testimonials)
      .where(and(eq(testimonials.status, "published"), eq(testimonials.consentConfirmed, true), isNull(testimonials.deletedAt)))
      .orderBy(desc(testimonials.createdAt))
      .limit(10)
  ).filter((t) => !isSample(t.authorName, t.quote));

  const logoClients = await db
    .select({ id: clients.id, name: clients.name, logo: mediaAssets })
    .from(clients)
    .innerJoin(mediaAssets, eq(mediaAssets.id, clients.logoMediaId))
    .where(and(eq(clients.showNamePublicly, true), isNull(clients.deletedAt)))
    .orderBy(asc(clients.name));

  return {
    settings,
    projects: landingProjects,
    services: serviceRows.map((s) => ({ id: s.id, title: s.title, summary: s.summary, iconKey: s.iconKey })),
    testimonial: testimonialRow ? { quote: testimonialRow.quote, authorName: testimonialRow.authorName, authorRole: testimonialRow.authorRole } : null,
    clientLogos: logoClients.filter((c) => c.logo.kind === "image" && !isSampleText(c.name)).map((c) => ({ id: c.id, name: c.name, logo: picture(c.logo) })),
  };
}

/**
 * Cached for an hour and dropped immediately by any admin change to projects, services, clients, testimonials or
 * settings (`invalidateContent`). One bundle, so a page never mixes two versions of the content.
 */
export const getLandingData = unstable_cache(() => loadLandingData(getDb()), ["landing-data"], {
  tags: Object.values(CONTENT_TAGS),
  revalidate: 3600,
});
