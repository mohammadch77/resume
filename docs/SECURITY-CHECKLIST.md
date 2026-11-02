# Security checklist (CLAUDE.md section 5), phase 7

Status: **done** = implemented and covered by the named test; **not done** = open (reason / where it is tracked). Last checked in phase 7.

| # | Rule | Status | Evidence |
|---|---|---|---|
| 1 | Argon2id | done | `lib/auth/password.ts` (`@node-rs/argon2`, 19 MiB / 2 passes); `tests/unit/auth-core.test.ts` |
| 2 | Login rate limit: per-account `failed_logins` / `locked_until` | done | `lib/auth/login.ts`; `tests/db/auth.test.ts` |
| 2b | Login rate limit: Nginx `limit_req` | **not done** | Phase 8 (Nginx); the in-process `RateLimiter` is the second layer only (BACKLOG) |
| 3 | Constant-time compare, generic login errors | done | argon2 `verify` against a dummy hash for unknown users; `tests/e2e/auth.spec.ts` "unknown email and wrong password show the same generic error" |
| 4 | CSRF: server actions + `Origin` check, every mutation behind `requireRole()` | done | `lib/auth/request.ts` `isAllowedOrigin`, `lib/auth/admin-action-core.ts`; `tests/unit/auth-core.test.ts`, `tests/db/admin-guards.test.ts`; `tests/e2e/route-sweep.spec.ts` (every admin route refuses anonymous visitors and mutations) |
| 5 | CSP, nonce-based | done for `/admin` (per-request nonce, no `unsafe-inline`/`unsafe-eval`): `tests/e2e/csp.spec.ts` |
| 5b | CSP for the public pages | **partly**: hardened directives yes, `script-src 'unsafe-inline'` stays (reason and residual risk in BACKLOG); `tests/e2e/seo-csp.spec.ts` |
| 6 | `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` | done | `next.config.ts` headers |
| 7 | HSTS | **not done** | Phase 8 (Nginx) |
| 8 | `/admin` `noindex` + `X-Robots-Tag` | done | `proxy.ts`; `tests/e2e/auth.spec.ts`, `tests/e2e/seo-csp.spec.ts` |
| 9 | Upload: size caps, magic-byte sniffing, re-encode through sharp (EXIF/GPS stripped), random filenames | done | `lib/media/config.ts`, `lib/media/encode.ts`; `tests/unit/media-core.test.ts`, `tests/e2e/media.spec.ts` |
| 9b | Uploads outside the app dir, served by Nginx, never executable | **not done** | Phase 8 (Nginx location for `/uploads`); today `UPLOADS_DIR` is configurable and the app serves nothing executable |
| 10 | Contact form: Zod, honeypot, minimum fill time, per-IP-hash rate limit, no HTML in stored text, escaped output | done | `lib/leads/submit.ts`; `tests/db/contact-submit.test.ts`, `tests/e2e/contact.spec.ts` |
| 11 | Raw IPs never stored (`sha256(ip + daily salt)`) | done | `lib/leads/submit.ts`; `tests/db/contact-submit.test.ts` |
| 12 | Cookies: `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, rotating session id, no JWT | done | `lib/auth/cookie.ts`, `lib/auth/config.ts`; `tests/e2e/auth.spec.ts` |
| 13 | Secrets only via env, validated by Zod at boot | done | `lib/env.ts`; `tests/unit/env.test.ts`; `.env` is git-ignored |
| 14 | `npm audit` gate | done | `npm run audit:prod` = 0 vulnerabilities (production dependencies); dev-only findings in BACKLOG |
| 15 | Lockfile committed, no unknown postinstall scripts | done | `package-lock.json` is tracked |
| 16 | JSON-LD cannot close its script element | done | `lib/seo/json-ld.ts` `serializeJsonLd`; `tests/unit/json-ld.test.ts` |
