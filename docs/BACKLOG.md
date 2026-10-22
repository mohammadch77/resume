# Backlog

- Verify React Bits LICENSE text in the upstream repo before shipping (docs/LIBS.md).
- Phase 8: one-shot migration job (`npm run db:migrate` as `migrator`) before the app starts; compose currently needs it run manually.
- Friendly Persian messages for DB errors GW001-GW005, 23001 (RESTRICT) in the admin UI (Phase 4).
- Strict nonce-based CSP replaces the header placeholder in next.config.ts (Phase 2).
- Subset the WOFF2 fonts (Persian + Latin + digits) if Lighthouse flags font weight (Phase 5/6).
- Phase 5b: the landing contact-form server action is a PUBLIC action. It must get the same Origin check (`isAllowedOrigin`, lib/auth/request.ts) and a per-IP-hash rate limit (`RateLimiter`, lib/auth/rate-limit.ts) as the login action, plus honeypot, min-fill-time and Zod. Add its file to the public-action allowlist in tests/unit/architecture.test.ts deliberately.
- Phase 8: Nginx `limit_req` for /admin/login (the in-process RateLimiter is only the second layer and is per-instance); set TRUST_PROXY=true only behind our Nginx.
- Admin UI uses neutral shadcn colours for now; restyle with Grin Web tokens when tokens land (Phase 4 / 5a).
- Users: only list + activate/deactivate exist; create/edit/reset-password come in Phase 4. No password-reset flow yet.
- Landing CSP uses `script-src 'self' 'unsafe-inline'` (experimental SRI adds no integrity attributes under Turbopack and could not cover Next's inline bootstrap scripts; measured in tests/e2e/csp.spec.ts). Hardening option: build-time sha256 hashes of inline scripts, or per-request nonce only if the budget allows dynamic rendering. Style attributes also need `style-src 'unsafe-inline'`.
- After Phase 5b: replace `'unsafe-inline'` in the landing `script-src` with build-time sha256 hashes of Next's inline scripts (post-build step that reads the prerendered HTML and writes the CSP header). Cost: one extra build step and a rebuild on every deploy. Re-run tests/e2e/csp.spec.ts to prove nothing is blocked.
