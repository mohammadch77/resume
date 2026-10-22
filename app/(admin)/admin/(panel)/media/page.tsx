import type { Metadata } from "next";
import { MediaCard } from "@/components/admin/media/media-card";
import { MediaUploader } from "@/components/admin/media/media-uploader";
import { ResponsivePicture } from "@/components/site/responsive-picture";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { listMedia } from "@/lib/media/library";
import { mediaUrl } from "@/lib/media/paths";
import { parseVariants } from "@/lib/media/variants";

export const metadata: Metadata = { title: "رسانه" };

export default async function MediaPage() {
  await requireRole("owner", "editor");
  const assets = await listMedia(getDb());
  const byId = new Map(assets.map((a) => [a.id, a]));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">رسانه</h1>
      <MediaUploader />
      {assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز فایلی بارگذاری نشده است.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((a) => {
            const posterVariants = parseVariants(a.posterMediaId ? byId.get(a.posterMediaId)?.variants : null);
            const posterSrc = posterVariants ? mediaUrl(posterVariants.items[posterVariants.items.length - 1].fallback.path) : undefined;
            const preview =
              a.kind === "image" ? (
                <ResponsivePicture asset={a} sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 100vw" placeholder={false} className="size-full object-cover" />
              ) : (
                <video controls preload="none" poster={posterSrc} src={mediaUrl(a.originalPath)} className="size-full object-cover" aria-label={a.altFa ?? "ویدیو"} />
              );
            return (
              <MediaCard
                key={a.id}
                asset={{ id: a.id, kind: a.kind, altFa: a.altFa, usageCount: a.usageCount, bytes: a.bytes, width: a.width, height: a.height }}
                preview={preview}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
