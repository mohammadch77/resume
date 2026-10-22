-- 0002: triggers. BEFORE triggers fire alphabetically: tg_10 version, tg_20 status, tg_30 gate, tg_90 updated_at.

-- ----------------------------------------------------------- updated_at
CREATE FUNCTION gw_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'media_assets', 'industries', 'tech_tags', 'services', 'clients',
                           'projects', 'testimonials', 'leads', 'site_settings']
  LOOP
    EXECUTE format('CREATE TRIGGER tg_90_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION gw_set_updated_at()', t);
  END LOOP;
END $$;

-- ------------------------------------------------------ optimistic lock
-- Every UPDATE must be written as: SET ..., version = version + 1 WHERE id = $1 AND version = $expected.
-- 0 rows updated = conflict. The trigger additionally refuses any UPDATE that does not bump version by exactly 1.
CREATE FUNCTION gw_enforce_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION 'version conflict on %: expected %, got %', TG_TABLE_NAME, OLD.version + 1, NEW.version
      USING ERRCODE = 'GW001';
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects', 'site_settings', 'services', 'testimonials']
  LOOP
    EXECUTE format('CREATE TRIGGER tg_10_version BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION gw_enforce_version()', t);
  END LOOP;
END $$;

-- -------------------------------------------------- content_status machine
-- draft -> published, published -> archived, published -> draft, archived -> draft.
CREATE FUNCTION gw_enforce_status_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT (
    (OLD.status = 'draft' AND NEW.status = 'published')
    OR (OLD.status = 'published' AND NEW.status IN ('archived', 'draft'))
    OR (OLD.status = 'archived' AND NEW.status = 'draft')
  ) THEN
    RAISE EXCEPTION 'illegal status transition on %: % -> %', TG_TABLE_NAME, OLD.status, NEW.status
      USING ERRCODE = 'GW002';
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects', 'services', 'testimonials']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER tg_20_status BEFORE UPDATE ON %I FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION gw_enforce_status_transition()', t);
  END LOOP;
END $$;

-- ------------------------------------------------------- project publish gate
-- The message lists every missing requirement as comma-separated codes so the admin UI can translate them:
-- cover, cover_alt, services, published_at, summary_length.
CREATE FUNCTION gw_project_publish_gate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE missing text[] := '{}';
BEGIN
  IF NEW.status = 'published' THEN
    IF NEW.cover_media_id IS NULL THEN
      missing := array_append(missing, 'cover'::text);
    ELSIF NOT EXISTS (SELECT 1 FROM media_assets m WHERE m.id = NEW.cover_media_id AND btrim(coalesce(m.alt_fa, '')) <> '') THEN
      missing := array_append(missing, 'cover_alt'::text);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM project_services ps WHERE ps.project_id = NEW.id) THEN
      missing := array_append(missing, 'services'::text);
    END IF;
    IF NEW.published_at IS NULL THEN
      missing := array_append(missing, 'published_at'::text);
    END IF;
    IF char_length(NEW.summary) < 20 THEN
      missing := array_append(missing, 'summary_length'::text);
    END IF;
    IF array_length(missing, 1) IS NOT NULL THEN
      RAISE EXCEPTION 'publish_gate: %', array_to_string(missing, ',') USING ERRCODE = 'GW003';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_30_publish_gate BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION gw_project_publish_gate();

-- A published project must keep at least one service.
CREATE FUNCTION gw_project_services_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM projects p WHERE p.id = OLD.project_id AND p.status = 'published')
     AND NOT EXISTS (SELECT 1 FROM project_services s WHERE s.project_id = OLD.project_id AND s.service_id <> OLD.service_id) THEN
    RAISE EXCEPTION 'publish_gate: services' USING ERRCODE = 'GW003';
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER tg_30_keep_service BEFORE DELETE ON project_services
  FOR EACH ROW EXECUTE FUNCTION gw_project_services_guard();

-- A cover used by a published project must keep its alt text.
CREATE FUNCTION gw_media_alt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF btrim(coalesce(NEW.alt_fa, '')) = '' AND EXISTS (
    SELECT 1 FROM projects p WHERE p.cover_media_id = NEW.id AND p.status = 'published'
  ) THEN
    RAISE EXCEPTION 'publish_gate: cover_alt' USING ERRCODE = 'GW003';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_30_alt_guard BEFORE UPDATE OF alt_fa ON media_assets
  FOR EACH ROW EXECUTE FUNCTION gw_media_alt_guard();

-- --------------------------------------------------------------- audit
-- Actor comes from SET LOCAL app.user_id / app.request_id (see withActor in lib/db).
-- password_hash is never copied into the log. leads are not audited: they hold visitor PII
-- that must disappear at retention, and the log is append-only.
CREATE FUNCTION gw_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  j_old jsonb;
  j_new jsonb;
  src jsonb;
  parts text[] := '{}';
  i integer;
  actor uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN j_old := to_jsonb(OLD) - 'password_hash'; END IF;
  IF TG_OP <> 'DELETE' THEN j_new := to_jsonb(NEW) - 'password_hash'; END IF;
  src := coalesce(j_new, j_old);
  FOR i IN 0 .. TG_NARGS - 1 LOOP
    parts := parts || (src ->> TG_ARGV[i]);
  END LOOP;
  actor := nullif(current_setting('app.user_id', true), '')::uuid;
  INSERT INTO audit_log (table_name, row_id, action, before_data, after_data, actor_id, request_id)
  VALUES (TG_TABLE_NAME, array_to_string(parts, ':'), TG_OP, j_old, j_new, actor,
          nullif(current_setting('app.request_id', true), ''));
  RETURN NULL;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'media_assets', 'industries', 'tech_tags', 'services', 'clients',
                           'projects', 'testimonials', 'site_settings', 'project_media', 'project_metrics']
  LOOP
    EXECUTE format('CREATE TRIGGER tg_95_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION gw_audit(''id'')', t);
  END LOOP;
END $$;

CREATE TRIGGER tg_95_audit AFTER INSERT OR UPDATE OR DELETE ON project_services
  FOR EACH ROW EXECUTE FUNCTION gw_audit('project_id', 'service_id');
CREATE TRIGGER tg_95_audit AFTER INSERT OR UPDATE OR DELETE ON project_tech
  FOR EACH ROW EXECUTE FUNCTION gw_audit('project_id', 'tech_tag_id');

-- audit_log is append-only
CREATE FUNCTION gw_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only' USING ERRCODE = 'GW004';
END $$;

CREATE TRIGGER tg_00_append_only BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION gw_audit_append_only();
CREATE TRIGGER tg_00_no_truncate BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION gw_audit_append_only();

-- ------------------------------------------------------- leads retention
-- Hard delete is allowed only once a lead is older than the retention window.
CREATE FUNCTION gw_leads_retention_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.created_at > now() - interval '365 days' THEN
    RAISE EXCEPTION 'lead is inside the 365-day retention window' USING ERRCODE = 'GW005';
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER tg_00_retention BEFORE DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION gw_leads_retention_guard();

CREATE FUNCTION purge_old_leads(retention_days integer DEFAULT 365) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  IF retention_days < 365 THEN
    RAISE EXCEPTION 'retention_days must be >= 365' USING ERRCODE = 'GW005';
  END IF;
  DELETE FROM leads WHERE created_at < now() - make_interval(days => retention_days);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
