import { updateTag } from "next/cache";
import type { ContentTag } from "./cache";

/**
 * Expires the cached public data for these tags immediately (read-your-own-writes). Only callable from a Server Action;
 * adminAction handlers run inside one.
 */
export function invalidateContent(...tags: ContentTag[]): void {
  for (const tag of tags) updateTag(tag);
}
