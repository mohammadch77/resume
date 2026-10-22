-- 0001: extensions, enums, tables, FKs, indexes, CHECKs.
-- Conventions: every column NOT NULL unless a comment documents what NULL means.
-- Custom SQLSTATEs used by triggers (0002): GW001 version conflict, GW002 illegal status
-- transition, GW003 publish gate, GW004 append-only, GW005 retention.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_role AS ENUM ('owner', 'editor');
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'won', 'lost', 'spam');
CREATE TYPE media_kind AS ENUM ('image', 'video');

-- ---------------------------------------------------------------- users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  role user_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  failed_logins integer NOT NULL DEFAULT 0,
  locked_until timestamptz,          -- NULL = not locked
  last_login_at timestamptz,         -- NULL = never logged in
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,            -- NULL = active (soft delete)
  CONSTRAINT users_email_format CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' AND char_length(email) <= 254),
  CONSTRAINT users_password_hash_len CHECK (char_length(password_hash) >= 20),
  CONSTRAINT users_display_name_len CHECK (char_length(display_name) BETWEEN 1 AND 80),
  CONSTRAINT users_failed_logins_nonneg CHECK (failed_logins >= 0)
);
CREATE UNIQUE INDEX users_email_active_uq ON users (email) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------- sessions
CREATE TABLE sessions (
  id text PRIMARY KEY,               -- sha256(token) hex; the raw token is never stored
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,           -- sliding expiry
  absolute_expires_at timestamptz NOT NULL,  -- hard cap
  ip_hash text,                      -- NULL = unknown
  user_agent text,                   -- NULL = not sent
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sessions_id_sha256 CHECK (id ~ '^[0-9a-f]{64}$'),
  CONSTRAINT sessions_ip_hash_sha256 CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT sessions_user_agent_len CHECK (user_agent IS NULL OR char_length(user_agent) <= 300),
  CONSTRAINT sessions_expiry_order CHECK (expires_at <= absolute_expires_at)
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- --------------------------------------------------------- media_assets
CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind media_kind NOT NULL,
  mime text NOT NULL,
  bytes bigint NOT NULL,
  width integer,                     -- NULL only for videos whose size is unknown
  height integer,
  alt_fa text,                       -- NULL/blank = alt text not written yet (blocks publishing)
  dominant_color text,               -- NULL = not computed
  sha256 text NOT NULL,
  original_path text NOT NULL,
  variants jsonb NOT NULL DEFAULT '{}'::jsonb,
  poster_media_id uuid REFERENCES media_assets (id) ON DELETE RESTRICT, -- NULL for images; videos need one (enforced in app)
  uploaded_by uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_mime_allowlist CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm')),
  CONSTRAINT media_mime_matches_kind CHECK ((kind = 'image' AND mime LIKE 'image/%') OR (kind = 'video' AND mime LIKE 'video/%')),
  CONSTRAINT media_bytes_limit CHECK (bytes > 0 AND ((kind = 'image' AND bytes <= 15728640) OR (kind = 'video' AND bytes <= 104857600))),
  CONSTRAINT media_dimensions_positive CHECK ((width IS NULL) = (height IS NULL) AND (width IS NULL OR (width > 0 AND height > 0))),
  CONSTRAINT media_image_has_dimensions CHECK (kind <> 'image' OR width IS NOT NULL),
  CONSTRAINT media_alt_fa_len CHECK (alt_fa IS NULL OR char_length(alt_fa) <= 300),
  CONSTRAINT media_dominant_color_hex CHECK (dominant_color IS NULL OR dominant_color ~ '^#[0-9a-fA-F]{6}$'),
  CONSTRAINT media_sha256_hex CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT media_original_path_safe CHECK (original_path ~ '^[A-Za-z0-9_./-]+$' AND original_path NOT LIKE '/%' AND original_path NOT LIKE '%..%'),
  CONSTRAINT media_variants_object CHECK (jsonb_typeof(variants) = 'object'),
  CONSTRAINT media_poster_only_video CHECK (kind = 'video' OR poster_media_id IS NULL),
  CONSTRAINT media_sha256_uq UNIQUE (sha256)
);
CREATE INDEX media_assets_uploaded_by_idx ON media_assets (uploaded_by);
CREATE INDEX media_assets_poster_media_id_idx ON media_assets (poster_media_id);

-- ------------------------------------------------- industries, tech_tags
CREATE TABLE industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT industries_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80),
  CONSTRAINT industries_name_len CHECK (char_length(name) BETWEEN 1 AND 80)
);
CREATE UNIQUE INDEX industries_slug_active_uq ON industries (slug) WHERE deleted_at IS NULL;

CREATE TABLE tech_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT tech_tags_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80),
  CONSTRAINT tech_tags_name_len CHECK (char_length(name) BETWEEN 1 AND 80)
);
CREATE UNIQUE INDEX tech_tags_slug_active_uq ON tech_tags (slug) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------- services
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  icon_key text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT services_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80),
  CONSTRAINT services_title_len CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT services_summary_len CHECK (char_length(summary) BETWEEN 1 AND 500),
  CONSTRAINT services_icon_key_format CHECK (icon_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT services_sort_order_nonneg CHECK (sort_order >= 0),
  CONSTRAINT services_version_positive CHECK (version >= 1),
  CONSTRAINT services_not_deleted_published CHECK (deleted_at IS NULL OR status <> 'published')
);
CREATE UNIQUE INDEX services_slug_active_uq ON services (slug) WHERE deleted_at IS NULL;

-- -------------------------------------------------------------- clients
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  industry_id uuid REFERENCES industries (id) ON DELETE RESTRICT, -- NULL = industry not specified
  logo_media_id uuid REFERENCES media_assets (id) ON DELETE RESTRICT, -- NULL = no logo
  website_url text,                  -- NULL = no website
  show_name_publicly boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT clients_name_len CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT clients_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80),
  CONSTRAINT clients_website_https CHECK (website_url IS NULL OR (website_url ~ '^https://' AND char_length(website_url) <= 2048))
);
CREATE UNIQUE INDEX clients_slug_active_uq ON clients (slug) WHERE deleted_at IS NULL;
CREATE INDEX clients_industry_id_idx ON clients (industry_id);
CREATE INDEX clients_logo_media_id_idx ON clients (logo_media_id);

-- ------------------------------------------------------------- projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  client_id uuid REFERENCES clients (id) ON DELETE RESTRICT, -- NULL = client withheld
  industry_id uuid NOT NULL REFERENCES industries (id) ON DELETE RESTRICT,
  summary text NOT NULL,
  challenge text NOT NULL DEFAULT '',
  solution text NOT NULL DEFAULT '',
  outcome text NOT NULL DEFAULT '',
  completed_on date,                 -- NULL = date not stated
  live_url text,                     -- NULL = no public URL
  cover_media_id uuid REFERENCES media_assets (id) ON DELETE RESTRICT, -- NULL until a cover is chosen (blocks publishing)
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,          -- NULL until first publish
  seo_title text,                    -- NULL = fall back to title
  seo_description text,              -- NULL = fall back to summary
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT projects_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80),
  CONSTRAINT projects_title_len CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT projects_summary_len CHECK (char_length(summary) BETWEEN 1 AND 280),
  CONSTRAINT projects_challenge_len CHECK (char_length(challenge) <= 4000),
  CONSTRAINT projects_solution_len CHECK (char_length(solution) <= 4000),
  CONSTRAINT projects_outcome_len CHECK (char_length(outcome) <= 4000),
  CONSTRAINT projects_live_url_https CHECK (live_url IS NULL OR (live_url ~ '^https://' AND char_length(live_url) <= 2048)),
  CONSTRAINT projects_sort_order_nonneg CHECK (sort_order >= 0),
  CONSTRAINT projects_seo_title_len CHECK (seo_title IS NULL OR char_length(seo_title) BETWEEN 1 AND 70),
  CONSTRAINT projects_seo_description_len CHECK (seo_description IS NULL OR char_length(seo_description) BETWEEN 1 AND 160),
  CONSTRAINT projects_version_positive CHECK (version >= 1),
  -- Column-level half of the publish gate (the trigger in 0002 checks services and cover alt text).
  CONSTRAINT projects_publish_columns CHECK (
    status <> 'published'
    OR (cover_media_id IS NOT NULL AND published_at IS NOT NULL AND char_length(summary) >= 20)
  ),
  CONSTRAINT projects_not_deleted_published CHECK (deleted_at IS NULL OR status <> 'published')
);
CREATE UNIQUE INDEX projects_slug_active_uq ON projects (slug) WHERE deleted_at IS NULL;
CREATE INDEX projects_client_id_idx ON projects (client_id);
CREATE INDEX projects_industry_id_idx ON projects (industry_id);
CREATE INDEX projects_cover_media_id_idx ON projects (cover_media_id);
CREATE INDEX projects_listing_idx ON projects (status, is_featured DESC, sort_order) WHERE deleted_at IS NULL;

-- --------------------------------------------- project join / child tables
CREATE TABLE project_services (
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services (id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, service_id)
);
CREATE INDEX project_services_service_id_idx ON project_services (service_id);

CREATE TABLE project_tech (
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  tech_tag_id uuid NOT NULL REFERENCES tech_tags (id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, tech_tag_id)
);
CREATE INDEX project_tech_tech_tag_id_idx ON project_tech (tech_tag_id);

CREATE TABLE project_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES media_assets (id) ON DELETE RESTRICT,
  position integer NOT NULL,
  caption text,                      -- NULL = no caption
  CONSTRAINT project_media_position_nonneg CHECK (position >= 0),
  CONSTRAINT project_media_caption_len CHECK (caption IS NULL OR char_length(caption) <= 200),
  CONSTRAINT project_media_position_uq UNIQUE (project_id, position) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT project_media_media_uq UNIQUE (project_id, media_id)
);
CREATE INDEX project_media_media_id_idx ON project_media (media_id);

CREATE TABLE project_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  label text NOT NULL,
  value_text text NOT NULL,
  position integer NOT NULL,
  CONSTRAINT project_metrics_label_len CHECK (char_length(label) BETWEEN 1 AND 80),
  CONSTRAINT project_metrics_value_len CHECK (char_length(value_text) BETWEEN 1 AND 40),
  CONSTRAINT project_metrics_position_nonneg CHECK (position >= 0),
  CONSTRAINT project_metrics_position_uq UNIQUE (project_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- --------------------------------------------------------- testimonials
CREATE TABLE testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
  project_id uuid REFERENCES projects (id) ON DELETE RESTRICT, -- NULL = not tied to one project
  author_name text NOT NULL,
  author_role text,                  -- NULL = role not stated
  quote text NOT NULL,
  consent_confirmed boolean NOT NULL DEFAULT false,
  status content_status NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT testimonials_author_name_len CHECK (char_length(author_name) BETWEEN 1 AND 80),
  CONSTRAINT testimonials_author_role_len CHECK (author_role IS NULL OR char_length(author_role) BETWEEN 1 AND 80),
  CONSTRAINT testimonials_quote_len CHECK (char_length(quote) BETWEEN 10 AND 600),
  CONSTRAINT testimonials_version_positive CHECK (version >= 1),
  CONSTRAINT testimonials_publish_needs_consent CHECK (status <> 'published' OR consent_confirmed = true),
  CONSTRAINT testimonials_not_deleted_published CHECK (deleted_at IS NULL OR status <> 'published')
);
CREATE INDEX testimonials_client_id_idx ON testimonials (client_id);
CREATE INDEX testimonials_project_id_idx ON testimonials (project_id);

-- ---------------------------------------------------------------- leads
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,                        -- normalized 09xxxxxxxxx; NULL if only email given
  email citext,                      -- NULL if only phone given
  company text,                      -- NULL = not given
  message text NOT NULL,
  budget_range text,                 -- NULL = not given
  source text NOT NULL DEFAULT 'landing',
  status lead_status NOT NULL DEFAULT 'new',
  consent boolean NOT NULL,
  ip_hash text,                      -- sha256(ip + daily salt); NULL = unavailable
  handled_by uuid REFERENCES users (id) ON DELETE RESTRICT, -- NULL = nobody handled it yet
  internal_notes text,               -- NULL = no notes
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_name_len CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT leads_phone_format CHECK (phone IS NULL OR phone ~ '^09[0-9]{9}$'),
  CONSTRAINT leads_email_format CHECK (email IS NULL OR (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' AND char_length(email) <= 254)),
  CONSTRAINT leads_contact_required CHECK (phone IS NOT NULL OR email IS NOT NULL),
  CONSTRAINT leads_company_len CHECK (company IS NULL OR char_length(company) BETWEEN 1 AND 120),
  CONSTRAINT leads_message_len CHECK (char_length(message) BETWEEN 1 AND 2000),
  CONSTRAINT leads_budget_len CHECK (budget_range IS NULL OR char_length(budget_range) BETWEEN 1 AND 40),
  CONSTRAINT leads_source_len CHECK (char_length(source) BETWEEN 1 AND 40),
  CONSTRAINT leads_consent_true CHECK (consent = true),
  CONSTRAINT leads_ip_hash_sha256 CHECK (ip_hash IS NULL OR ip_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT leads_notes_len CHECK (internal_notes IS NULL OR char_length(internal_notes) <= 4000),
  -- No markup in stored visitor text; output is escaped as well.
  CONSTRAINT leads_no_html CHECK (name !~ '[<>]' AND message !~ '[<>]' AND (company IS NULL OR company !~ '[<>]'))
);
CREATE INDEX leads_handled_by_idx ON leads (handled_by);
CREATE INDEX leads_status_created_idx ON leads (status, created_at DESC);

-- -------------------------------------------------------- site_settings
CREATE FUNCTION gw_socials_valid(s jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_typeof(s) = 'object' AND NOT EXISTS (
    SELECT 1 FROM jsonb_each(s) AS e
    WHERE e.key NOT IN ('telegram', 'bale', 'eitaa', 'instagram', 'linkedin', 'github', 'aparat', 'x', 'whatsapp')
       OR jsonb_typeof(e.value) <> 'string'
       OR (e.value #>> '{}') !~ '^https://'
  )
$$;

CREATE TABLE site_settings (
  id smallint PRIMARY KEY,
  brand_name text NOT NULL,
  hero_title text NOT NULL,
  hero_subtitle text NOT NULL,
  primary_cta_label text NOT NULL,
  contact_phone text,                -- NULL = not shown
  contact_email citext,              -- NULL = not shown
  contact_address text,              -- NULL = not shown
  socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_title text,                    -- NULL = use brand_name
  seo_description text,              -- NULL = use hero_subtitle
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1),
  CONSTRAINT site_settings_brand_len CHECK (char_length(brand_name) BETWEEN 1 AND 60),
  CONSTRAINT site_settings_hero_title_len CHECK (char_length(hero_title) BETWEEN 1 AND 120),
  CONSTRAINT site_settings_hero_subtitle_len CHECK (char_length(hero_subtitle) BETWEEN 1 AND 300),
  CONSTRAINT site_settings_cta_len CHECK (char_length(primary_cta_label) BETWEEN 1 AND 40),
  CONSTRAINT site_settings_phone_format CHECK (contact_phone IS NULL OR contact_phone ~ '^0[0-9]{10}$'),
  CONSTRAINT site_settings_email_format CHECK (contact_email IS NULL OR contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT site_settings_address_len CHECK (contact_address IS NULL OR char_length(contact_address) <= 300),
  CONSTRAINT site_settings_socials_shape CHECK (gw_socials_valid(socials)),
  CONSTRAINT site_settings_seo_title_len CHECK (seo_title IS NULL OR char_length(seo_title) BETWEEN 1 AND 70),
  CONSTRAINT site_settings_seo_description_len CHECK (seo_description IS NULL OR char_length(seo_description) BETWEEN 1 AND 160),
  CONSTRAINT site_settings_version_positive CHECK (version >= 1)
);

-- ------------------------------------------------------------ audit_log
-- No FK on actor_id on purpose: the log must outlive and never block any other table.
CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  row_id text NOT NULL,
  action text NOT NULL,
  before_data jsonb,                 -- NULL for INSERT
  after_data jsonb,                  -- NULL for DELETE
  actor_id uuid,                     -- NULL = no authenticated actor (system / anonymous)
  request_id text,                   -- NULL = not part of an HTTP request
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_action_valid CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);
CREATE INDEX audit_log_row_idx ON audit_log (table_name, row_id);
CREATE INDEX audit_log_created_at_idx ON audit_log (created_at DESC);
CREATE INDEX audit_log_actor_idx ON audit_log (actor_id);
