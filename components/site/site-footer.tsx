const year = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", timeZone: "Asia/Tehran" });

type Props = { brand: string; ctaLabel: string; consultHref: string };

/** `consultHref` is a plain link (tel:, https:// or #anchor from the site settings; /contact, the contact form, until one is saved), not a button. */
export function SiteFooter({ brand, ctaLabel, consultHref }: Props) {
  return (
    <footer className="lk-foot">
      <div className="lk-wrap">
        <b dir="ltr">{brand}</b>
        <a className="lk-foot__link" href={consultHref} {...(consultHref.startsWith("https://") ? { rel: "noopener noreferrer" } : {})}>
          {ctaLabel}
        </a>
        <small>
          © {year.format(new Date())} {brand} · همه‌ی حقوق محفوظ است.
        </small>
      </div>
    </footer>
  );
}
