# Running the admin panel locally

Needs Node 24 (the version the Dockerfile uses) and Docker (only for the database).

1. **Database** (Postgres 18 with the `migrator` and `app_rw` roles, on `127.0.0.1:5433`):

   ```bash
   docker compose -f deploy/docker-compose.dev.yml up -d --wait
   ```

2. **`.env`** in the repo root (git-ignored). Copy `.env.example` and set:

   ```ini
   NODE_ENV=development
   DATABASE_URL=postgres://app_rw:dev-app-rw@127.0.0.1:5433/grinweb
   MIGRATOR_DATABASE_URL=postgres://migrator:dev-migrator@127.0.0.1:5433/grinweb
   SESSION_SECRET=local-dev-session-secret-0123456789abcdef
   SITE_URL=http://localhost:3000
   UPLOADS_DIR=./uploads
   OWNER_EMAIL=you@example.com
   OWNER_PASSWORD=choose-a-password-of-12-or-more-characters
   ```

3. **Schema, first owner, optional sample content**:

   ```bash
   npm install
   npm run db:migrate     # applies drizzle/migrations as `migrator`
   npm run seed:owner     # creates the owner from OWNER_EMAIL / OWNER_PASSWORD (idempotent)
   npm run db:seed        # optional: draft sample content, every title/summary starts with «نمونه»
   ```

4. **Run and sign in**:

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000/admin/login> and use `OWNER_EMAIL` / `OWNER_PASSWORD`.

## Notes

- Sample content is never part of a migration. It cannot be published until its «نمونه» text is replaced.
- After `seed:owner`, `db:seed` or any direct SQL, restart `npm run dev`: those scripts cannot expire Next's content
  cache, so a running server may keep serving old public pages (see `docs/BACKLOG.md`).
- Reset everything: `docker compose -f deploy/docker-compose.dev.yml down -v` (deletes the dev database).
- Tests use a separate throwaway database (`npm run test:db`, `npm run test:e2e`); they never touch this one.
