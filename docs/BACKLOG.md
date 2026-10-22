# Backlog

- Verify React Bits LICENSE text in the upstream repo before shipping (docs/LIBS.md).
- Phase 8: one-shot migration job (`npm run db:migrate` as `migrator`) before the app starts; compose currently needs it run manually.
- Friendly Persian messages for DB errors GW001-GW005, 23001 (RESTRICT) in the admin UI (Phase 4).
- Strict nonce-based CSP replaces the header placeholder in next.config.ts (Phase 2).
- Subset the WOFF2 fonts (Persian + Latin + digits) if Lighthouse flags font weight (Phase 5/6).
