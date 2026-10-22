import { getCurrentSession } from "./current-user";
import { isAllowedOrigin, siteOrigin } from "./request";
import type { SessionUser } from "./session";

export type RequestAuth = { ok: true; user: SessionUser } | { ok: false; status: 401 | 403; code: "unauthenticated" | "forbidden" | "bad_origin" };

/**
 * Authentication for route handlers that sit outside the proxy matcher (large uploads, which the proxy
 * would truncate at its body-buffer limit). Same checks as the proxy + adminAction: Origin, session, role.
 */
export async function authenticateAdminRequest(request: Request, roles: SessionUser["role"][]): Promise<RequestAuth> {
  if (!isAllowedOrigin(request.headers.get("origin"), siteOrigin())) return { ok: false, status: 403, code: "bad_origin" };
  const session = await getCurrentSession();
  if (!session) return { ok: false, status: 401, code: "unauthenticated" };
  if (!roles.includes(session.user.role)) return { ok: false, status: 403, code: "forbidden" };
  return { ok: true, user: session.user };
}
