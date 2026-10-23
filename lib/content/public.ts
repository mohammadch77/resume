import { getLandingData, type LandingProject } from "./landing";

/**
 * A published, non-deleted, non-demo project by slug, or null. It reads the cached landing bundle (tags:
 * projects, services, clients, testimonials, settings), so it is dropped by `invalidateContent(...)` like the landing.
 * Note the spike finding: a 404 is cached too, so every admin mutation of public content must call invalidateContent.
 */
export async function getPublishedProject(slug: string): Promise<LandingProject | null> {
  const { projects } = await getLandingData();
  return projects.find((p) => p.slug === slug) ?? null;
}
