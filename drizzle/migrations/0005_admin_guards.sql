-- 0005: guards the admin panel relies on. Rules only, no data: migrations also run in production, so sample content
-- lives in scripts/seed.ts (`npm run db:seed`), never here.
--   GW007  the last active owner cannot be removed, demoted, deactivated or deleted
--   GW008  a row that live rows still reference cannot be soft-deleted

-- --------------------------------------------------------- at least one active owner
-- Concurrent demotions of two owners would each see the other still active, so they are serialised with an
-- advisory lock that is held until the transaction ends.
CREATE FUNCTION gw_keep_one_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role = 'owner' AND OLD.is_active AND OLD.deleted_at IS NULL
     AND (TG_OP = 'DELETE' OR NEW.role <> 'owner' OR NOT NEW.is_active OR NEW.deleted_at IS NOT NULL) THEN
    PERFORM pg_advisory_xact_lock(hashtext('gw_keep_one_owner'));
    IF NOT EXISTS (
      SELECT 1 FROM users u WHERE u.id <> OLD.id AND u.role = 'owner' AND u.is_active AND u.deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'last_owner: at least one active owner must remain' USING ERRCODE = 'GW007';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_40_keep_owner BEFORE UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION gw_keep_one_owner();

-- ------------------------------------------------- no soft delete of a record in use
-- Soft delete leaves the foreign keys untouched, so RESTRICT cannot catch it. "In use" means a live (not
-- soft-deleted) row points at it.
CREATE FUNCTION gw_refuse_soft_delete_in_use() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE in_use boolean := false;
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    IF TG_TABLE_NAME = 'industries' THEN
      in_use := EXISTS (SELECT 1 FROM projects WHERE industry_id = OLD.id AND deleted_at IS NULL)
             OR EXISTS (SELECT 1 FROM clients WHERE industry_id = OLD.id AND deleted_at IS NULL);
    ELSIF TG_TABLE_NAME = 'tech_tags' THEN
      in_use := EXISTS (SELECT 1 FROM project_tech pt JOIN projects p ON p.id = pt.project_id
                        WHERE pt.tech_tag_id = OLD.id AND p.deleted_at IS NULL);
    ELSIF TG_TABLE_NAME = 'services' THEN
      in_use := EXISTS (SELECT 1 FROM project_services ps JOIN projects p ON p.id = ps.project_id
                        WHERE ps.service_id = OLD.id AND p.deleted_at IS NULL);
    ELSIF TG_TABLE_NAME = 'clients' THEN
      in_use := EXISTS (SELECT 1 FROM projects WHERE client_id = OLD.id AND deleted_at IS NULL)
             OR EXISTS (SELECT 1 FROM testimonials WHERE client_id = OLD.id AND deleted_at IS NULL);
    ELSIF TG_TABLE_NAME = 'projects' THEN
      in_use := EXISTS (SELECT 1 FROM testimonials WHERE project_id = OLD.id AND deleted_at IS NULL);
    END IF;
    IF in_use THEN
      RAISE EXCEPTION 'in_use: % is still referenced', TG_TABLE_NAME USING ERRCODE = 'GW008';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['industries', 'tech_tags', 'services', 'clients', 'projects']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER tg_40_not_in_use BEFORE UPDATE OF deleted_at ON %I FOR EACH ROW EXECUTE FUNCTION gw_refuse_soft_delete_in_use()', t);
  END LOOP;
END $$;
