import { Button, Chip, Field, Icon, Metric, Modal, Navbar, ProjectCard, Testimonial, type IconName } from "@/components/ds";
import "./cards.css";

const NAV_LINKS = [
  { label: "نمونه‌کارها", href: "#work" },
  { label: "خدمات", href: "#services" },
  { label: "روش کار", href: "#process" },
  { label: "مشتریان", href: "#clients" },
];

const ICON_NAMES: IconName[] = ["arrow-left", "arrow-up-left", "check", "x", "menu", "circle-alert", "circle-check", "triangle-alert", "phone", "mail", "map-pin", "calendar", "code-xml", "layout-grid", "trash-2"];

/** Same content as design/components/<name>/<name>.card.html, composed from our components. */
export type CardName = "button" | "chip" | "field" | "icon" | "metric" | "modal" | "navbar" | "project-card" | "testimonial";

export const CARD_NAMES: CardName[] = ["button", "chip", "field", "icon", "metric", "modal", "navbar", "project-card", "testimonial"];

type Card = { chrome?: "sunken" | "bare"; node: React.ReactNode };

export const CARDS: Record<CardName, Card> = {
  button: {
    node: (
      <div className="stack">
        <div className="row">
          <Button>درخواست مشاوره رایگان</Button>
          <Button variant="secondary">مشاهده نمونه‌کارها</Button>
          <Button variant="quiet" iconEnd="arrow-left">
            مشاهده‌ی جزئیات
          </Button>
        </div>
        <div className="row">
          <Button variant="danger" iconStart="trash-2">
            حذف پروژه
          </Button>
          <Button disabled>در حال ارسال…</Button>
          <Button variant="quiet" iconOnly="x" label="بستن" />
        </div>
        <div className="row">
          <Button size="sm">ذخیره تغییرات</Button>
          <Button size="sm" variant="secondary">
            پیش‌نمایش
          </Button>
          <Button size="sm" variant="quiet">
            انصراف
          </Button>
          <Button size="sm" variant="danger">
            حذف
          </Button>
          <Button size="sm" disabled>
            غیرفعال
          </Button>
        </div>
        <div className="row dark" data-theme="dark">
          <Button>درخواست مشاوره رایگان</Button>
          <Button variant="secondary">مشاهده نمونه‌کارها</Button>
          <Button variant="quiet">جزئیات</Button>
          <Button variant="danger" size="sm">
            حذف
          </Button>
        </div>
      </div>
    ),
  },
  chip: {
    node: (
      <div className="stack">
        <div className="gw-chip-row">
          <Chip>فروشگاه اینترنتی</Chip>
          <Chip>سامانه‌ی سازمانی</Chip>
          <Chip variant="outline">Next.js</Chip>
          <Chip variant="outline">Laravel</Chip>
        </div>
        <div className="gw-chip-row" role="group" aria-label="فیلتر نمونه‌کارها">
          <Chip variant="filter" selected>
            همه
          </Chip>
          <Chip variant="filter">وب‌سایت</Chip>
          <Chip variant="filter">فروشگاه</Chip>
          <Chip variant="filter">نرم‌افزار</Chip>
        </div>
        <div className="gw-chip-row">
          <Chip variant="success">منتشر شده</Chip>
          <Chip variant="warning">پیش‌نویس</Chip>
          <Chip variant="danger">رد شده</Chip>
        </div>
        <div className="gw-chip-row dark" data-theme="dark">
          <Chip>فروشگاه</Chip>
          <Chip variant="outline">React</Chip>
          <Chip variant="filter" selected>
            همه
          </Chip>
          <Chip variant="success">منتشر شده</Chip>
          <Chip variant="warning">پیش‌نویس</Chip>
          <Chip variant="danger">رد شده</Chip>
        </div>
      </div>
    ),
  },
  field: {
    node: (
      <div className="grid">
        <Field label="نام و نام خانوادگی" placeholder="مثلاً سارا محمدی" autoComplete="name" />
        <Field label="شماره تماس" type="tel" dir="ltr" defaultValue="۰۹۱۲" hint="فقط برای هماهنگی جلسه تماس می‌گیریم." />
        <Field label="ایمیل" type="email" dir="ltr" defaultValue="sara@" error="یک ایمیل کامل بنویسید، مثل name@site.ir" />
        <Field label="نام شرکت" disabled defaultValue="[نام شرکت]" />
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="درباره‌ی پروژه‌تان" multiline optional placeholder="چه می‌سازید و چه زمانی به آن نیاز دارید؟" style={{ minBlockSize: "var(--space-9)" }} />
        </div>
      </div>
    ),
  },
  icon: {
    node: (
      <div className="row" style={{ gap: "calc(var(--space-5) + var(--space-1))", color: "var(--color-ink)" }}>
        {ICON_NAMES.map((n) => (
          <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "calc(var(--space-1) * 1.5)" }}>
            <Icon name={n} size={24} />
            <span className="gw-t-caption" style={{ color: "var(--color-ink-subtle)" }} dir="ltr">
              {n}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  metric: {
    node: (
      <div className="three">
        <Metric value="[عدد]٪" label="کاهش زمان ثبت سفارش" source="از پنل مدیریت" sample />
        <Metric value="[عدد]" label="پروژه‌ی تحویل‌شده" source="۱۴۰۰ تا ۱۴۰۴" sample />
        <Metric value="[عدد]" label="روز تا نسخه‌ی اول" source="میانگین پروژه‌ها" sample />
      </div>
    ),
  },
  modal: {
    chrome: "bare",
    node: (
      <div style={{ position: "relative", height: "100vh" }}>
        <Modal
          contained
          sample
          art={2}
          title="فروشگاه آنلاین لوازم خانگی"
          tags={["فروشگاه اینترنتی", "Next.js", "پنل مدیریت"]}
          challenge="مشتریان در مرحله‌ی پرداخت سبد خرید را رها می‌کردند و مدیریت سفارش‌ها دستی بود."
          solution="مسیر خرید را به سه مرحله کوتاه کردیم و پنل سفارش‌ها را به انبار متصل کردیم."
          outcome="[نتیجه‌ی واقعی از پنل مدیریت؛ بدون عدد ساختگی.]"
          primaryHref="#contact"
        />
      </div>
    ),
  },
  navbar: {
    chrome: "sunken",
    node: (
      <div className="stack">
        <Navbar current="#work" links={NAV_LINKS} />
        <div className="dark" data-theme="dark" style={{ padding: "var(--space-4)", background: "var(--color-sunken)" }}>
          <Navbar links={NAV_LINKS} />
        </div>
      </div>
    ),
  },
  "project-card": {
    node: (
      <div className="two">
        <ProjectCard art={2} tags={["فروشگاه اینترنتی", "Next.js"]} title="فروشگاه آنلاین لوازم خانگی" summary="بازطراحی مسیر خرید و پنل مدیریت سفارش‌ها برای یک فروشگاه چندشعبه." />
        <ProjectCard art={3} tags={["سامانه‌ی سازمانی"]} title="داشبورد مدیریت پروژه" summary="ابزار داخلی برای پیگیری کارها، جلسه‌ها و صورت‌حساب‌ها." />
      </div>
    ),
  },
  testimonial: {
    node: <Testimonial quote="«[متن نظر مشتری اینجا قرار می‌گیرد؛ دو تا چهار خط، بدون ویرایش و با اجازه‌ی کتبی خود او.]»" name="[نام مشتری]" role="مدیر محصول، [نام شرکت]" sample />,
  },
};

export function CardPage({ name }: { name: CardName }) {
  const { chrome, node } = CARDS[name];
  return <div className={["ds-card", chrome && `ds-card--${chrome}`].filter(Boolean).join(" ")}>{node}</div>;
}
