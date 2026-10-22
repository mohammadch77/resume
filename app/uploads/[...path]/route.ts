import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { env } from "@/lib/env";
import { EXT_CONTENT_TYPE } from "@/lib/media/config";
import { resolveUploadPath } from "@/lib/media/paths";

export const dynamic = "force-dynamic";

const HEADERS = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
  "Accept-Ranges": "bytes",
} as const;

/**
 * Serves uploaded files when no reverse proxy does it. In production Nginx serves /uploads directly from the
 * volume (immutable caching); this route is the same contract for development and for a bare `next start`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const file = resolveUploadPath(path.resolve(env().UPLOADS_DIR), segments);
  const contentType = file ? EXT_CONTENT_TYPE[path.extname(file).slice(1).toLowerCase()] : undefined;
  if (!file || !contentType) return new Response("Not found", { status: 404 });

  let size: number;
  try {
    const s = await stat(file);
    if (!s.isFile()) return new Response("Not found", { status: 404 });
    size = s.size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(body, {
      status: 206,
      headers: { ...HEADERS, "Content-Type": contentType, "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}` },
    });
  }

  const body = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(body, { headers: { ...HEADERS, "Content-Type": contentType, "Content-Length": String(size) } });
}
