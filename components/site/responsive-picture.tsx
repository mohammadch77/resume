import { mediaUrl } from "@/lib/media/paths";
import { parseVariants } from "@/lib/media/variants";

export type PictureAsset = {
  altFa: string | null;
  width: number | null;
  height: number | null;
  dominantColor: string | null;
  variants: unknown;
};

type Props = {
  asset: PictureAsset;
  /** `sizes` attribute; describe the rendered width, e.g. "(min-width: 768px) 420px, 100vw". */
  sizes?: string;
  /** Mark the LCP image: eager + fetchpriority=high. Everything else is lazy. */
  priority?: boolean;
  /**
   * Paint the dominant colour behind the image while it loads. Uses an inline style, so it must be turned off
   * where the CSP has no 'unsafe-inline' for styles (the nonce-based admin CSP).
   */
  placeholder?: boolean;
  /** Overrides the stored Persian alt text (use "" for purely decorative images). */
  alt?: string;
  className?: string;
};

/**
 * AVIF -> WebP -> JPEG/PNG `<picture>` built from `media_assets.variants`. Width and height always come from the
 * database, so the browser reserves the space before the image loads (no layout shift).
 */
export function ResponsivePicture({ asset, sizes = "100vw", priority = false, placeholder = true, alt, className }: Props) {
  const variants = parseVariants(asset.variants);
  if (!variants || !asset.width || !asset.height) return null;

  const srcSet = (pick: "avif" | "webp" | "fallback") =>
    variants.items.map((item) => `${mediaUrl(item[pick].path)} ${item.width}w`).join(", ");
  const largest = variants.items[variants.items.length - 1];

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />
      <img
        src={mediaUrl(largest.fallback.path)}
        srcSet={srcSet("fallback")}
        sizes={sizes}
        width={asset.width}
        height={asset.height}
        alt={alt ?? asset.altFa ?? ""}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className={className}
        style={placeholder && asset.dominantColor ? { backgroundColor: asset.dominantColor } : undefined}
      />
    </picture>
  );
}
