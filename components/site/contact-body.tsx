import type { LandingSettings } from "@/lib/content/landing";
import { SOCIAL_NETWORKS, type SocialKey } from "@/lib/validation/settings";
import { ContactForm } from "./contact-form";

type Props = { settings: Pick<LandingSettings, "contactPhone" | "contactEmail" | "contactAddress" | "socials">; ctaLabel: string };

/** The /contact page: headline, contact details from the site settings (an empty one is not shown, no placeholders) and the form. */
export function ContactBody({ settings, ctaLabel }: Props) {
  const { contactPhone, contactEmail, contactAddress, socials } = settings;
  const socialLinks = Object.entries(socials).filter(([key]) => key in SOCIAL_NETWORKS) as Array<[SocialKey, string]>;
  const hasDetails = Boolean(contactPhone || contactEmail || contactAddress || socialLinks.length);
  return (
    <div className="lm-shell lm-contact">
      <div>
        <h1 className="lm-contact__title" id="contact-title">
          درباره‌ی پروژه‌تان بگویید
        </h1>
        <p className="lm-contact__lead">نیازتان را بنویسید؛ مسیر پیشنهادی را با هم بررسی می‌کنیم.</p>
        {hasDetails ? (
          <dl className="lm-contact__details">
            {contactPhone ? (
              <>
                <dt>تلفن</dt>
                <dd dir="ltr">
                  <a href={`tel:${contactPhone}`}>{contactPhone}</a>
                </dd>
              </>
            ) : null}
            {contactEmail ? (
              <>
                <dt>ایمیل</dt>
                <dd dir="ltr">
                  <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                </dd>
              </>
            ) : null}
            {contactAddress ? (
              <>
                <dt>نشانی</dt>
                <dd>{contactAddress}</dd>
              </>
            ) : null}
            {socialLinks.length > 0 ? (
              <>
                <dt>شبکه‌ها</dt>
                <dd className="lm-contact__socials">
                  {socialLinks.map(([key, url]) => (
                    <a key={key} href={url} rel="noopener noreferrer">
                      {SOCIAL_NETWORKS[key]}
                    </a>
                  ))}
                </dd>
              </>
            ) : null}
          </dl>
        ) : null}
      </div>
      <ContactForm ctaLabel={ctaLabel} />
    </div>
  );
}
