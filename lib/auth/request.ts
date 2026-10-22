import { env } from "@/lib/env";
import { hashIp } from "./tokens";

/** Client IP, only trusted from X-Forwarded-For when TRUST_PROXY=true (i.e. behind our own Nginx). */
export function getClientIp(headers: Headers): string | null {
  if (env().TRUST_PROXY !== "true") return null;
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || null;
}

export function requestMeta(headers: Headers): { ipHash: string | null; userAgent: string | null } {
  const ip = getClientIp(headers);
  return {
    ipHash: ip ? hashIp(ip, env().SESSION_SECRET) : null,
    userAgent: headers.get("user-agent"),
  };
}

export function siteOrigin(): string {
  return new URL(env().SITE_URL).origin;
}

/** Mutations must come from our own origin. A missing Origin header is rejected. */
export function isAllowedOrigin(origin: string | null, allowed: string): boolean {
  return origin !== null && origin === allowed;
}
