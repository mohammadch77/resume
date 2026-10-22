import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE as SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { clearedSessionCookie, sessionCookie } from "@/lib/auth/cookie";
import { isAllowedOrigin, requestMeta, siteOrigin } from "@/lib/auth/request";
import { touchOrRotate, validateSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { buildAdminCsp } from "@/lib/security/csp";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function harden(res: NextResponse, csp?: string): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  if (csp) res.headers.set("Content-Security-Policy", csp);
  return res;
}

/**
 * Guard for everything under /admin: Origin check on mutations, session validation,
 * session touch/rotation, nonce CSP and noindex. Authorization (roles) is checked again
 * in layouts and inside every server action; this is the first layer, not the only one.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";
  const mutating = !SAFE_METHODS.has(request.method);

  if (mutating && !isAllowedOrigin(request.headers.get("origin"), siteOrigin())) {
    return harden(new NextResponse("Forbidden", { status: 403 }));
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = token ? await validateSession(db, token) : null;

  if (!isLogin && !session) {
    if (mutating) return harden(new NextResponse("Unauthorized", { status: 401 }));
    const res = NextResponse.redirect(new URL("/admin/login", request.url));
    if (token) res.cookies.set(clearedSessionCookie());
    return harden(res);
  }
  if (isLogin && session && !mutating) {
    return harden(NextResponse.redirect(new URL("/admin", request.url)));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildAdminCsp(nonce, process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (session && token) {
    const rotated = await touchOrRotate(db, token, session, requestMeta(request.headers), new Date());
    if (rotated) {
      response.cookies.set(sessionCookie(rotated.token, rotated.expiresAt));
    }
  }
  return harden(response, csp);
}

export const config = {
  matcher: ["/admin/:path*"],
};

