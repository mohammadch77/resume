-- 0007: everything that is text, a number or a picture on the landing page, editable from the admin (v2 redesign). Rules only, no data:
-- the singleton row is created by `npm run db:seed` (like site_settings), the default copy lives in lib/content/home-defaults.ts.
--   home_content  singleton (id = 1): hero texts and the two hero images, rating, status bar, about, section headings, band, footer
--   hero_cards    the hero's carousel (1..5 cards), content_status machine, «نمونه» can not be published
--   home_stats    the stats panel (1..4 figures), the same rules; with none published the section is absent
-- SQLSTATE GW009 = a hero image rule (same size, alt text) is broken; GW006 (wrong media kind / mime) is reused.

-- ------------------------------------------------------------ home_content
CREATE TABLE home_content (
  id smallint PRIMARY KEY,
  hero_eyebrow text NOT NULL,
  hero_line1 text NOT NULL,
  hero_line2 text NOT NULL,
  hero_line3 text NOT NULL,
  hero_description text NOT NULL,
  hero_secondary_cta_label text NOT NULL,
  hero_image_base_id uuid REFERENCES media_assets (id) ON DELETE RESTRICT,   -- NULL (with the hover one): the hero is typography only
  hero_image_hover_id uuid REFERENCES media_assets (id) ON DELETE RESTRICT,
  hero_rating_score smallint,        -- NULL (with the label) = no rating row: it is a claim, so it is never shown until the owner enters it
  hero_rating_label text,
  status_left text,                  -- NULL = that part of the status bar is not shown
  status_center text,
  status_right text,
  about_eyebrow text NOT NULL,
  about_lead text NOT NULL,
  about_rest text NOT NULL,
  about_note text,                   -- NULL = not shown
  work_eyebrow text NOT NULL,
  work_title text NOT NULL,
  services_eyebrow text NOT NULL,
  services_title text NOT NULL,
  stats_eyebrow text NOT NULL,
  stats_title text NOT NULL,
  band_title text NOT NULL,
  band_text text NOT NULL,
  footer_tagline text NOT NULL,
  footer_legal text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT home_content_singleton CHECK (id = 1),
  CONSTRAINT home_content_hero_eyebrow_len CHECK (char_length(hero_eyebrow) BETWEEN 1 AND 60),
  CONSTRAINT home_content_hero_lines_len CHECK (
    char_length(hero_line1) BETWEEN 1 AND 60 AND char_length(hero_line2) BETWEEN 1 AND 60 AND char_length(hero_line3) BETWEEN 1 AND 60
  ),
  CONSTRAINT home_content_hero_description_len CHECK (char_length(hero_description) BETWEEN 1 AND 300),
  CONSTRAINT home_content_hero_secondary_len CHECK (char_length(hero_secondary_cta_label) BETWEEN 1 AND 40),
  CONSTRAINT home_content_hero_images_together CHECK ((hero_image_base_id IS NULL) = (hero_image_hover_id IS NULL)),
  CONSTRAINT home_content_hero_images_differ CHECK (hero_image_base_id IS NULL OR hero_image_base_id <> hero_image_hover_id),
  CONSTRAINT home_content_rating_together CHECK ((hero_rating_score IS NULL) = (hero_rating_label IS NULL)),
  CONSTRAINT home_content_rating_range CHECK (hero_rating_score IS NULL OR hero_rating_score BETWEEN 1 AND 5),
  CONSTRAINT home_content_rating_label_len CHECK (hero_rating_label IS NULL OR char_length(hero_rating_label) BETWEEN 1 AND 60),
  CONSTRAINT home_content_status_len CHECK (
    (status_left IS NULL OR char_length(status_left) BETWEEN 1 AND 60)
    AND (status_center IS NULL OR char_length(status_center) BETWEEN 1 AND 60)
    AND (status_right IS NULL OR char_length(status_right) BETWEEN 1 AND 60)
  ),
  CONSTRAINT home_content_about_len CHECK (
    char_length(about_eyebrow) BETWEEN 1 AND 60 AND char_length(about_lead) BETWEEN 1 AND 200
    AND char_length(about_rest) BETWEEN 1 AND 300 AND (about_note IS NULL OR char_length(about_note) BETWEEN 1 AND 160)
  ),
  CONSTRAINT home_content_headings_len CHECK (
    char_length(work_eyebrow) BETWEEN 1 AND 60 AND char_length(work_title) BETWEEN 1 AND 80
    AND char_length(services_eyebrow) BETWEEN 1 AND 60 AND char_length(services_title) BETWEEN 1 AND 80
    AND char_length(stats_eyebrow) BETWEEN 1 AND 60 AND char_length(stats_title) BETWEEN 1 AND 80
  ),
  CONSTRAINT home_content_band_len CHECK (char_length(band_title) BETWEEN 1 AND 120 AND char_length(band_text) BETWEEN 1 AND 300),
  CONSTRAINT home_content_footer_len CHECK (char_length(footer_tagline) BETWEEN 1 AND 200 AND char_length(footer_legal) BETWEEN 1 AND 120),
  CONSTRAINT home_content_version_positive CHECK (version >= 1)
);
CREATE INDEX home_content_hero_image_base_idx ON home_content (hero_image_base_id);
CREATE INDEX home_content_hero_image_hover_idx ON home_content (hero_image_hover_id);

-- The two hero images are drawn on top of each other and the second is revealed through the first one's silhouette, so both must be
-- images that carry transparency (png, webp, avif; not jpeg), both need alt text, and both must have exactly the same pixel size.
CREATE FUNCTION gw_hero_images_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base media_assets;
  hover media_assets;
BEGIN
  -- one of them missing is the CHECK's business (home_content_hero_images_together), not this trigger's
  IF NEW.hero_image_base_id IS NULL OR NEW.hero_image_hover_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO base FROM media_assets WHERE id = NEW.hero_image_base_id;
  SELECT * INTO hover FROM media_assets WHERE id = NEW.hero_image_hover_id;
  IF base.kind <> 'image' OR hover.kind <> 'image' OR base.mime NOT IN ('image/png', 'image/webp', 'image/avif')
     OR hover.mime NOT IN ('image/png', 'image/webp', 'image/avif') THEN
    RAISE EXCEPTION 'media_kind: hero images must be png, webp or avif images' USING ERRCODE = 'GW006';
  END IF;
  IF btrim(coalesce(base.alt_fa, '')) = '' OR btrim(coalesce(hover.alt_fa, '')) = '' THEN
    RAISE EXCEPTION 'hero_image: alt' USING ERRCODE = 'GW009';
  END IF;
  IF base.width <> hover.width OR base.height <> hover.height THEN
    RAISE EXCEPTION 'hero_image: size (% x % and % x %)', base.width, base.height, hover.width, hover.height USING ERRCODE = 'GW009';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_30_hero_images BEFORE INSERT OR UPDATE OF hero_image_base_id, hero_image_hover_id ON home_content
  FOR EACH ROW EXECUTE FUNCTION gw_hero_images_guard();

-- A hero image in use keeps its alt text (the same rule as a published project's cover).
CREATE FUNCTION gw_hero_alt_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF btrim(coalesce(NEW.alt_fa, '')) = '' AND EXISTS (
    SELECT 1 FROM home_content h WHERE h.hero_image_base_id = NEW.id OR h.hero_image_hover_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'hero_image: alt' USING ERRCODE = 'GW009';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_31_hero_alt_guard BEFORE UPDATE OF alt_fa ON media_assets
  FOR EACH ROW EXECUTE FUNCTION gw_hero_alt_guard();

-- ------------------------------------------------------------- hero_cards
CREATE TABLE hero_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caption text NOT NULL,
  title text NOT NULL,
  position smallint NOT NULL,
  status content_status NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hero_cards_caption_len CHECK (char_length(caption) BETWEEN 1 AND 40),
  CONSTRAINT hero_cards_title_len CHECK (char_length(title) BETWEEN 1 AND 80),
  CONSTRAINT hero_cards_position_range CHECK (position BETWEEN 1 AND 5),
  CONSTRAINT hero_cards_version_positive CHECK (version >= 1),
  CONSTRAINT hero_cards_no_sample_published CHECK (status <> 'published' OR (caption NOT LIKE 'نمونه%' AND title NOT LIKE 'نمونه%')),
  CONSTRAINT hero_cards_position_uq UNIQUE (position) DEFERRABLE INITIALLY DEFERRED
);

-- -------------------------------------------------------------- home_stats
CREATE TABLE home_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value integer NOT NULL,
  suffix text NOT NULL DEFAULT '',
  label text NOT NULL,
  position smallint NOT NULL,
  status content_status NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT home_stats_value_range CHECK (value BETWEEN 0 AND 999999),
  CONSTRAINT home_stats_suffix_len CHECK (char_length(suffix) <= 4),
  CONSTRAINT home_stats_label_len CHECK (char_length(label) BETWEEN 1 AND 60),
  CONSTRAINT home_stats_position_range CHECK (position BETWEEN 1 AND 4),
  CONSTRAINT home_stats_version_positive CHECK (version >= 1),
  CONSTRAINT home_stats_no_sample_published CHECK (status <> 'published' OR label NOT LIKE 'نمونه%'),
  CONSTRAINT home_stats_position_uq UNIQUE (position) DEFERRABLE INITIALLY DEFERRED
);

-- ----------------------------------------------- shared triggers (see 0002)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['home_content', 'hero_cards', 'home_stats']
  LOOP
    EXECUTE format('CREATE TRIGGER tg_10_version BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION gw_enforce_version()', t);
    EXECUTE format('CREATE TRIGGER tg_90_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION gw_set_updated_at()', t);
    EXECUTE format('CREATE TRIGGER tg_95_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION gw_audit(''id'')', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['hero_cards', 'home_stats']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER tg_20_status BEFORE UPDATE ON %I FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION gw_enforce_status_transition()', t);
  END LOOP;
END $$;

-- ------------------------------------------------------------------ grants
-- The singleton can be read and updated, never inserted (the seed creates it as migrator) or deleted. The two lists are ordinary child
-- rows: positions are unique, so removing a card or a figure really deletes it (the audit log keeps what it was).
GRANT SELECT, UPDATE ON home_content TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON hero_cards, home_stats TO app_rw;
