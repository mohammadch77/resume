/** The contact form lives at /contact (a page without JavaScript, a dialog over the landing with it). */
export const CONTACT_HREF = "/contact";

/**
 * Where the footer's consultation link goes: the stored link (`tel:`, `https://` or `#anchor`, see site_settings.consult_cta_href),
 * or the contact form when it is empty. "#contact" was the anchor of the old contact section, which no longer exists, so a stored
 * "#contact" means the contact form too.
 */
export function resolveConsultHref(stored: string | null | undefined): string {
  return !stored || stored === "#contact" ? CONTACT_HREF : stored;
}
