-- 0006: the link behind the footer's "free consultation" line. Rules only, no data.
--   NULL = the link scrolls to the contact form (#contact)
--   otherwise one of: tel:+98912..., https://..., #anchor
ALTER TABLE site_settings ADD COLUMN consult_cta_href text;

ALTER TABLE site_settings ADD CONSTRAINT site_settings_consult_href_format CHECK (
  consult_cta_href IS NULL OR (
    char_length(consult_cta_href) <= 200
    AND consult_cta_href ~ '^(tel:\+?[0-9]{5,15}|https://[^[:space:]<>"]+|#[A-Za-z0-9_-]+)$'
  )
);
