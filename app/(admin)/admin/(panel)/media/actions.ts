"use server";

import path from "node:path";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminAction } from "@/lib/auth/admin-action";
import { mediaAssets } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { deleteMediaRow, removeDeletedFiles } from "@/lib/media/library";
import type { MediaErrorCode } from "@/lib/media/messages";

export const updateAltAction = adminAction(
  { roles: ["owner", "editor"], schema: z.object({ id: z.uuid(), alt: z.string().trim().min(1, "متن جایگزین را بنویسید.").max(300) }) },
  async ({ tx, input }): Promise<{ saved: true }> => {
    await tx.update(mediaAssets).set({ altFa: input.alt }).where(eq(mediaAssets.id, input.id));
    revalidatePath("/admin/media");
    return { saved: true };
  },
);

export const deleteMediaAction = adminAction(
  { roles: ["owner", "editor"], schema: z.object({ id: z.uuid() }) },
  async ({ tx, input }): Promise<{ deleted: true } | { deleted: false; code: Extract<MediaErrorCode, "in_use" | "not_found"> }> => {
    const result = await deleteMediaRow(tx, input.id);
    if (!result.ok) return { deleted: false, code: result.reason };
    // Files go last: if anything above had failed, no file would have been touched.
    await removeDeletedFiles(path.resolve(env().UPLOADS_DIR), result.removedFiles);
    revalidatePath("/admin/media");
    return { deleted: true };
  },
);
