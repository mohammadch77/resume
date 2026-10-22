import { randomBytes } from "node:crypto";
import path from "node:path";

const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

/**
 * Maps URL segments to a file inside `root`, or null. Every segment must be a plain name
 * (no dots-only, separators, encoded traversal, NUL, drive letters), and the result must stay inside root.
 */
export function resolveUploadPath(root: string, segments: string[]): string | null {
  if (segments.length === 0) return null;
  for (const s of segments) {
    if (!SEGMENT.test(s) || s.includes("..")) return null;
  }
  const base = path.resolve(root);
  const full = path.resolve(base, ...segments);
  return full.startsWith(base + path.sep) ? full : null;
}

/** Random, unguessable, extension-less base such as `media/3f/3fa9…`; the uploaded file name is never used. */
export function newMediaBase(): string {
  const id = randomBytes(16).toString("hex");
  return `media/${id.slice(0, 2)}/${id}`;
}

export const mediaUrl = (relPath: string): string => `/uploads/${relPath}`;
