# Backlog

- Verify React Bits LICENSE text in the upstream repo before shipping (docs/LIBS.md).
- docker-compose (Phase 0) connects the app as the postgres superuser; Phase 1 replaces it with the `app_rw` role.
- Strict nonce-based CSP replaces the header placeholder in next.config.ts (Phase 2).
- Subset the WOFF2 fonts (Persian + Latin + digits) if Lighthouse flags font weight (Phase 5/6).
