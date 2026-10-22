import { randomUUID } from "node:crypto";
import path from "node:path";
import { authenticateAdminRequest } from "@/lib/auth/request-auth";
import { getDb } from "@/lib/db/client";
import { env } from "@/lib/env";
import { UPLOAD_MAX_REQUEST_BYTES } from "@/lib/media/config";
import { IngestError, ingestImage, ingestVideo, type IngestResult } from "@/lib/media/ingest";
import { sniffMime, isVideoMime } from "@/lib/media/sniff";
import type { MediaErrorCode } from "@/lib/media/messages";

export const dynamic = "force-dynamic";

const fail = (status: number, code: MediaErrorCode) => Response.json({ ok: false, code }, { status });

const STATUS: Record<IngestError["code"], number> = {
  empty: 400,
  unsupported_type: 415,
  too_large: 413,
  corrupt_image: 422,
  video_needs_poster: 400,
};

/**
 * POST multipart/form-data: `file` (image, or video) and, for videos, `poster` (image).
 * Not covered by proxy.ts (the proxy buffers only 10 MB of a body), so it authenticates itself.
 */
export async function POST(request: Request) {
  const auth = await authenticateAdminRequest(request, ["owner", "editor"]);
  if (!auth.ok) return fail(auth.status, auth.code);

  const length = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length > UPLOAD_MAX_REQUEST_BYTES) return fail(413, "too_large");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "bad_request");
  }
  const file = form.get("file");
  const poster = form.get("poster");
  if (!(file instanceof File)) return fail(400, "bad_request");

  const ctx = {
    db: getDb(),
    uploadsDir: path.resolve(env().UPLOADS_DIR),
    userId: auth.user.id,
    requestId: randomUUID(),
  };
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    let result: IngestResult;
    if (isVideoMime(sniffMime(bytes))) {
      const posterBytes = poster instanceof File ? Buffer.from(await poster.arrayBuffer()) : null;
      result = await ingestVideo(ctx, bytes, posterBytes);
    } else {
      result = await ingestImage(ctx, bytes);
    }
    const { asset } = result;
    return Response.json({ ok: true, deduped: result.deduped, asset: { id: asset.id, kind: asset.kind } });
  } catch (err) {
    if (err instanceof IngestError) return fail(STATUS[err.code], err.code);
    console.error("media upload failed", err);
    return fail(500, "server_error");
  }
}
