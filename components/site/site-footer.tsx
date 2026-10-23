const year = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", timeZone: "Asia/Tehran" });

export function SiteFooter({ brand }: { brand: string }) {
  return (
    <footer className="lk-foot">
      <div className="lk-wrap">
        <b dir="ltr">{brand}</b>
        <small>
          © {year.format(new Date())} {brand} · همه‌ی حقوق محفوظ است.
        </small>
      </div>
    </footer>
  );
}
