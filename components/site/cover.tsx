import type { PictureData } from "@/lib/content/landing";
import { ResponsivePicture } from "./responsive-picture";

/**
 * A project's cover through ResponsivePicture (AVIF/WebP/JPEG, width and height from the database), as a node for the
 * `cover` slot of ProjectCard / Modal. Returns null when the project has no image: those components then draw the design
 * system's token-built CoverArt (the fallback). `decorative` gives the image an empty alt (hero art is aria-hidden).
 */
export function coverNode(picture: PictureData | null, sizes: string, options: { priority?: boolean; decorative?: boolean } = {}): React.ReactNode {
  if (!picture) return null;
  return <ResponsivePicture asset={picture} sizes={sizes} priority={options.priority} alt={options.decorative ? "" : undefined} className="lk-cover-img" />;
}
