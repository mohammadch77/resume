import { Icon } from "@/components/ds";
import type { LandingSettings } from "@/lib/content/landing";
import { SOCIAL_NETWORKS, type SocialKey } from "@/lib/validation/settings";
import { ContactForm } from "./contact-form";

type Props = { settings: Pick<LandingSettings, "contactPhone" | "contactEmail" | "contactAddress" | "socials">; ctaLabel: string };

/** Contact details come from the site settings; an empty one is not shown (no «[شماره تماس]» placeholders in production). */
export function ContactSection({ settings, ctaLabel }: Props) {
  const { contactPhone, contactEmail, contactAddress, socials } = settings;
  const socialLinks = Object.entries(socials).filter(([key]) => key in SOCIAL_NETWORKS) as Array<[SocialKey, string]>;
  const hasDetails = Boolean(contactPhone || contactEmail || contactAddress || socialLinks.length);
  return (
    <section className="lk-sec lk-sec--sunken" id="contact" aria-labelledby="contact-title">
      <div className="lk-wrap lk-contact">
        <div>
          <h2 className="lk-h2" id="contact-title">
            درباره‌ی پروژه‌تان بگویید
          </h2>
          <p className="lk-lead">در یک جلسه‌ی کوتاه نیازتان را می‌شنویم و مسیر پیشنهادی را رایگان می‌گوییم.</p>
          {hasDetails && (
            <dl>
              {contactPhone && (
                <>
                  <dt>
                    <Icon name="phone" size={18} />
                    تلفن
                  </dt>
                  <dd dir="ltr">
                    <a href={`tel:${contactPhone}`}>{contactPhone}</a>
                  </dd>
                </>
              )}
              {contactEmail && (
                <>
                  <dt>
                    <Icon name="mail" size={18} />
                    ایمیل
                  </dt>
                  <dd dir="ltr">
                    <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                  </dd>
                </>
              )}
              {contactAddress && (
                <>
                  <dt>
                    <Icon name="map-pin" size={18} />
                    نشانی
                  </dt>
                  <dd>{contactAddress}</dd>
                </>
              )}
              {socialLinks.length > 0 && (
                <>
                  <dt>شبکه‌ها</dt>
                  <dd className="lk-socials">
                    {socialLinks.map(([key, url]) => (
                      <a key={key} href={url} rel="noopener noreferrer">
                        {SOCIAL_NETWORKS[key]}
                      </a>
                    ))}
                  </dd>
                </>
              )}
            </dl>
          )}
        </div>
        <ContactForm ctaLabel={ctaLabel} />
      </div>
    </section>
  );
}
