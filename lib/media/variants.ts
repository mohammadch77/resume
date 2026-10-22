import { z } from "zod";

const file = z.object({ path: z.string().min(1), bytes: z.number().int().positive() });

export const variantsSchema = z.object({
  fallbackFormat: z.enum(["jpeg", "png"]),
  items: z
    .array(z.object({ width: z.number().int().positive(), height: z.number().int().positive(), avif: file, webp: file, fallback: file }))
    .min(1),
});

/** Shape stored in `media_assets.variants` for images (videos store `{}`). */
export type ImageVariants = z.infer<typeof variantsSchema>;

export function parseVariants(value: unknown): ImageVariants | null {
  const parsed = variantsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Every file that belongs to an asset, as paths relative to the uploads directory. */
export function assetFilePaths(asset: { originalPath: string; variants: unknown }): string[] {
  const paths = [asset.originalPath];
  const v = parseVariants(asset.variants);
  if (v) for (const item of v.items) paths.push(item.avif.path, item.webp.path, item.fallback.path);
  return paths;
}
