-- 0004: video policy.
--  * Videos are capped at 25 MB (was 100 MB). Keep in sync with VIDEO_MAX_BYTES in lib/media/config.ts;
--    tests/db/video-policy.test.ts fails if the two ever differ.
--  * A video always has a poster image.
--  * Video is allowed only in a project's gallery (project_media). It can never be a project cover, a client
--    logo, or another video's poster; the hero has no media column at all.
-- SQLSTATE GW006 = media of the wrong kind for this slot.

ALTER TABLE media_assets DROP CONSTRAINT media_bytes_limit;
ALTER TABLE media_assets ADD CONSTRAINT media_bytes_limit CHECK (
  bytes > 0 AND ((kind = 'image' AND bytes <= 15728640) OR (kind = 'video' AND bytes <= 26214400))
);
ALTER TABLE media_assets ADD CONSTRAINT media_video_has_poster CHECK (kind <> 'video' OR poster_media_id IS NOT NULL);

CREATE FUNCTION gw_media_must_be_image() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ref uuid;
BEGIN
  ref := to_jsonb(NEW) ->> TG_ARGV[0];
  IF ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM media_assets m WHERE m.id = ref AND m.kind = 'image') THEN
    RAISE EXCEPTION 'media_kind: %.% must reference an image', TG_TABLE_NAME, TG_ARGV[0] USING ERRCODE = 'GW006';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_25_cover_is_image BEFORE INSERT OR UPDATE OF cover_media_id ON projects
  FOR EACH ROW EXECUTE FUNCTION gw_media_must_be_image('cover_media_id');
CREATE TRIGGER tg_25_logo_is_image BEFORE INSERT OR UPDATE OF logo_media_id ON clients
  FOR EACH ROW EXECUTE FUNCTION gw_media_must_be_image('logo_media_id');
CREATE TRIGGER tg_25_poster_is_image BEFORE INSERT OR UPDATE OF poster_media_id ON media_assets
  FOR EACH ROW EXECUTE FUNCTION gw_media_must_be_image('poster_media_id');
