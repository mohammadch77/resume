import { KitDemo } from "@/components/dev/kit-demo";
import { HOME_TEXT_DEFAULTS, contactTexts } from "@/lib/content/home-defaults";
import { SiteLauncher } from "@/components/site/site-launcher";
import { Eyebrow, PillButton, PortfolioCard, ServiceRow, StatsPanel, TagChip } from "@/components/site/ui";
import tokens from "@/design/tokens.json";
import "@/components/site/page.css";

export const metadata = { title: "Dev · v2 kit" };

const TYPE_SAMPLES: Array<[string, string]> = [
  ["display-xl", "ایده‌های جسورانه، با دقتی آرام"],
  ["display-md", "سایتی که کار شما را نشان می‌دهد"],
  ["heading-1", "نمونه‌کارهای منتخب"],
  ["heading-3", "طراحی و توسعه‌ی محصول دیجیتال"],
  ["body-lg", "ما با تیم‌های جاه‌طلب همکاری می‌کنیم تا محصول دیجیتال، هویت برند و راهبردی را که این دو را کنار هم نگه می‌دارد تحویل دهیم."],
  ["body", "متن اصلی صفحه: خوانا، با فاصله‌ی خط بلند و بدون فاصله‌گذاری حروف. اعداد فارسی: ۰۱۲۳۴۵۶۷۸۹ و ۱۴۰۴/۰۸/۱۰."],
  ["body-sm", "متن کوچک‌تر برای توضیح کارت‌ها و فرم‌ها، هنوز با کنتراست AA."],
  ["caption", "برچسب و زیرنویس · نمونه‌کار · ۱۴۰۴"],
];

/** Developer page: every v2 kit piece, the tokens and the type scale on one screen (404 in production, like all /dev pages). */
export default function KitPage() {
  return (
    <div className="lm-root lm-page">
      <main className="lm-shell lm-kit" id="main">
        <section aria-labelledby="k-colors" className="lm-kit__section">
          <h1 id="k-colors" style={{ font: "600 var(--text-heading-1)/var(--text-heading-1--line-height) var(--font-sans)", marginBlockEnd: "1.5rem" }}>رنگ‌ها (design/tokens.json)</h1>
          <div className="lm-kit__swatches">
            {Object.entries(tokens.color).map(([name, value]) => (
              <div key={name} className="lm-kit__swatch">
                <span className="lm-kit__chip" style={{ background: `var(--color-${name})` }} />
                <strong>{name}</strong>
                <br />
                <span dir="ltr">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="k-type">
          <h2 id="k-type" style={{ font: "600 var(--text-heading-2)/var(--text-heading-2--line-height) var(--font-sans)", marginBlockEnd: "1.5rem" }}>مقیاس نوشتار (Estedad ۴۰۰ و ۶۰۰)</h2>
          {TYPE_SAMPLES.map(([name, text]) => (
            <p key={name} data-type={name} style={{ font: `${name.startsWith("body") || name === "caption" ? 400 : 600} var(--text-${name})/var(--text-${name}--line-height) var(--font-sans)`, marginBlockEnd: "1rem" }}>
              {text}
            </p>
          ))}
        </section>

        <section aria-labelledby="k-buttons">
          <h2 id="k-buttons" style={{ font: "600 var(--text-heading-2)/var(--text-heading-2--line-height) var(--font-sans)", marginBlockEnd: "1.5rem" }}>دکمه، برچسب، منو، پنجره</h2>
          <div className="lm-kit__row" style={{ marginBlockEnd: "1rem" }}>
            <PillButton href="/contact" variant="accent" arrow="forward">درخواست مشاوره رایگان</PillButton>
            <PillButton href="/contact" variant="dark" arrow="up">درخواست مشاوره رایگان</PillButton>
            <PillButton href="#work" variant="outline" arrow="forward">نمونه‌کارها</PillButton>
            <PillButton href="#work" variant="light">بدون فلش</PillButton>
          </div>
          <div className="lm-kit__row" style={{ marginBlockEnd: "1rem" }}>
            <Eyebrow>مستقل و جمع‌وجور</Eyebrow>
            <Eyebrow bordered>نمونه‌کارها</Eyebrow>
            <TagChip tone="dark">طراحی وب</TagChip>
            <TagChip tone="dark">سئو</TagChip>
          </div>
          <KitDemo />
        </section>

        <section aria-labelledby="k-cards">
          <h2 id="k-cards" style={{ font: "600 var(--text-heading-2)/var(--text-heading-2--line-height) var(--font-sans)", marginBlockEnd: "1.5rem" }}>کارت نمونه‌کار</h2>
          <div className="lm-kit__grid">
            <PortfolioCard href="#a" title="نمونه · فروشگاه اینترنتی" description="نمونه‌ی متن کوتاه برای دیدن چیدمان کارت روی زمینه‌ی تیره." category="وب‌سایت" year="۱۴۰۴" tags={["طراحی وب", "فروشگاه", "سئو"]} />
            <PortfolioCard href="#b" title="نمونه · اپلیکیشن سلامت" description="کارت بدون کاور نشان برند را در مرکز می‌گذارد." category="موبایل" year="۱۴۰۳" tags={["اپلیکیشن", "پژوهش کاربر"]} />
          </div>
        </section>

        <section aria-labelledby="k-services">
          <h2 id="k-services" style={{ font: "600 var(--text-heading-2)/var(--text-heading-2--line-height) var(--font-sans)", marginBlockEnd: "1.5rem" }}>ردیف خدمات</h2>
          <ul>
            <ServiceRow index={1} title="طراحی و توسعه‌ی وب‌سایت" summary="سایت سریع و قابل‌مدیریت برای کسب‌وکار شما." />
            <ServiceRow index={2} title="طراحی محصول" summary="رابطی که ساده به نظر می‌رسد و زیبا کار می‌کند." />
            <ServiceRow index={3} title="مشاوره" summary="راهبرد و مسیر روشن برای تیم‌های جاه‌طلب." />
          </ul>
        </section>

        <StatsPanel
          eyebrow="در یک نگاه"
          title="نمونه‌ی پنل آمار؛ مقدارها واقعی نیستند"
          stats={[
            { value: 150, suffix: "+", label: "نمونه · پروژه‌ی تحویل‌شده" },
            { value: 98, suffix: "٪", label: "نمونه · رضایت مشتری" },
            { value: 12, suffix: "", label: "نمونه · سال تجربه" },
            { value: 40, suffix: "+", label: "نمونه · عضو تیم" },
          ]}
        />
      </main>
      <SiteLauncher ctaLabel="درخواست مشاوره رایگان" contact={contactTexts(HOME_TEXT_DEFAULTS)} />
    </div>
  );
}
