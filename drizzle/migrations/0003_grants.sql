-- 0003: least-privilege grants. Roles themselves are created outside migrations by a superuser
-- (deploy/postgres/init/01-roles.sh, tests/db/global-setup.ts) because CREATE ROLE needs CREATEROLE.
-- Tables are owned by `migrator`; `app_rw` is not an owner, so it can never ALTER/DROP anything.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    RAISE EXCEPTION 'role app_rw does not exist; create roles first (see deploy/postgres/init)';
  END IF;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_rw;

-- Soft-deleted content tables: no DELETE.
GRANT SELECT, INSERT, UPDATE ON
  users, industries, tech_tags, services, clients, projects, testimonials, site_settings
TO app_rw;

-- Hard-deletable: sessions, leads (guarded by retention trigger), media (FK RESTRICT protects used files), join/child tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  sessions, leads, media_assets, project_services, project_tech, project_media, project_metrics
TO app_rw;

-- Append-only log.
GRANT SELECT, INSERT ON audit_log TO app_rw;
GRANT USAGE ON SEQUENCE audit_log_id_seq TO app_rw;

GRANT EXECUTE ON FUNCTION purge_old_leads(integer) TO app_rw;
