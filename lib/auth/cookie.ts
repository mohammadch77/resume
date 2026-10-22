import { SESSION_COOKIE } from "./config";

const base = { httpOnly: true, secure: true, sameSite: "lax", path: "/" } as const;

/** Options object accepted by both `cookies().set(...)` and `NextResponse.cookies.set(...)`. */
export function sessionCookie(token: string, expires: Date) {
  return { name: SESSION_COOKIE, value: token, expires, ...base };
}

/** `__Host-` cookies can only be overwritten with the same attributes, so clearing keeps `Secure`. */
export function clearedSessionCookie() {
  return { name: SESSION_COOKIE, value: "", maxAge: 0, ...base };
}
