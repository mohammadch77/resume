import { desc } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import { mediaUrl } from "./paths";
import { parseVariants } from "./variants";

/** What a media picker needs to show one choice. Plain data, safe to pass to a client component. */
export type PickerOption = { id: string; kind: "image" | "video"; alt: string; src: string };

/**
 * Newest assets first, as picker choices. `kinds` limits the list (cover and logo pickers: images only; the gallery
 * picker also lists videos). The thumbnail is the smallest variant, or the poster-less placeholder for videos.
 */
export async function listPickerOptions(db: Db, kinds: Array<"image" | "video">, limit = 200): Promise<PickerOption[]> {
  const rows = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(limit);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: PickerOption[] = [];
  for (const r of rows) {
    if (!kinds.includes(r.kind)) continue;
    const source = r.kind === "video" && r.posterMediaId ? byId.get(r.posterMediaId) ?? null : r;
    const variants = source ? parseVariants(source.variants) : null;
    out.push({
      id: r.id,
      kind: r.kind,
      alt: r.altFa ?? "",
      src: variants ? mediaUrl(variants.items[0].fallback.path) : "",
    });
  }
  return out;
}
