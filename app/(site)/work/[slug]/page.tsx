import { notFound } from "next/navigation";
import { getPublishedProject } from "@/lib/content/public";

// ISR: rendered on first request, cached, and refreshed when admin actions expire the `content:projects` tag.
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

/** Minimal public case-study page (Phase 4). Phase 5b replaces the markup with the design-system layout. */
export default async function WorkPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) notFound();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-3xl font-semibold">{project.title}</h1>
      <p>{project.summary}</p>
    </main>
  );
}
