import { getCurrentSession } from "./current-user";
import { isAllowedOrigin, siteOrigin } from "./request";
import type { SessionUser } from "./session";

export type RequestAuth = { ok: true; user: SessionUser } | { ok: false; status: 401 | 403; code: "unauthenticated" | "forbidden" | "bad_origin" };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Authentication for admin route handlers: Origin, session, role. Same checks as the proxy + adminAction, so a
 * handler is safe on its own (the upload handler sits outside the proxy matcher on purpose: the proxy would truncate
 * large bodies). Like the proxy, the Origin check applies to mutating methods only: a browser does not send Origin on
 * a same-origin GET navigation such as a download link, and a GET cannot change anything.
 */
export async function authenticateAdminRequest(request: Request, roles: SessionUser["role"][]): Promise<RequestAuth> {
  if (!SAFE_METHODS.has(request.method) && !isAllowedOrigin(request.headers.get("origin"), siteOrigin())) {
    return { ok: false, status: 403, code: "bad_origin" };
  }
  const session = await getCurrentSession();
  if (!session) return { ok: false, status: 401, code: "unauthenticated" };
  if (!roles.includes(session.user.role)) return { ok: false, status: 403, code: "forbidden" };
  return { ok: true, user: session.user };
}
