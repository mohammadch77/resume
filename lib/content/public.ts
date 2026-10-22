import { and, eq, isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { CONTENT_TAGS } from "./cache";

export type PublicProject = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  challenge: string;
  solution: string;
  outcome: string;
  publishedAt: string | null;
};

/**
 * A published, non-deleted project by slug, or null. Cached under the `content:projects` tag; the cache entry
 * is dropped by `invalidateContent(CONTENT_TAGS.projects)`. Values are JSON-safe (dates as ISO strings).
 */
export async function getPublishedProject(slug: string): Promise<PublicProject | null> {
  const load = unstable_cache(
    async (): Promise<PublicProject | null> => {
      const [row] = await getDb()
        .select({
          id: projects.id,
          slug: projects.slug,
          title: projects.title,
          summary: projects.summary,
          challenge: projects.challenge,
          solution: projects.solution,
          outcome: projects.outcome,
          publishedAt: projects.publishedAt,
        })
        .from(projects)
        .where(and(eq(projects.slug, slug), eq(projects.status, "published"), isNull(projects.deletedAt)))
        .limit(1);
      return row ? { ...row, publishedAt: row.publishedAt?.toISOString() ?? null } : null;
    },
    ["public-project", slug],
    { tags: [CONTENT_TAGS.projects], revalidate: 3600 },
  );
  return load();
}
