import { mediaUrl } from "@/lib/media/paths";
import { parseVariants } from "@/lib/media/variants";

type VideoAsset = { originalPath: string; mime: string; altFa: string | null };
type PosterAsset = { width: number | null; height: number | null; variants: unknown };

type Props = { video: VideoAsset; poster: PosterAsset | null; className?: string };

/**
 * The only way a video is rendered. Video is allowed in a project's gallery (the case-study modal) and nowhere else:
 * not the hero, not a card cover (the database also refuses a video as cover / logo / poster).
 * It never loads before the visitor presses play (`preload="none"`), never autoplays, and without a poster
 * image it is not rendered at all.
 */
export function GalleryVideo({ video, poster, className }: Props) {
  const variants = parseVariants(poster?.variants);
  if (!poster || !variants || !poster.width || !poster.height) return null;
  const posterSrc = mediaUrl(variants.items[variants.items.length - 1].fallback.path);

  return (
    <video
      controls
      playsInline
      preload="none"
      poster={posterSrc}
      width={poster.width}
      height={poster.height}
      aria-label={video.altFa ?? undefined}
      className={className}
    >
      <source src={mediaUrl(video.originalPath)} type={video.mime} />
    </video>
  );
}
