const join = (directives: string[]) => directives.join("; ");

/**
 * /admin is rendered per request, so it can use a nonce.
 * In development React needs 'unsafe-eval' and HMR injects style tags (a nonce would disable 'unsafe-inline').
 */
export function buildAdminCsp(nonce: string, isDev: boolean): string {
  return join([
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    isDev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]);
}

/**
 * The landing is static (ISR): there is no per-request nonce, and Next's experimental SRI does not
 * work under Turbopack and could not cover the inline RSC/bootstrap scripts anyway (verified in tests/e2e/csp.spec.ts:
 * they are blocked without 'unsafe-inline').
 * So scripts are limited to our own origin plus 'unsafe-inline', on the landing only. Tracked in docs/BACKLOG.md.
 */
export function buildLandingCsp(isDev: boolean): string {
  return join([
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]);
}
