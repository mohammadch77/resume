import { Button, Chip, CoverArt, CropFrame, Field, Icon, ICON_NAMES, Metric, Modal, Navbar, ProjectCard, Testimonial } from "@/components/ds";
import tokens from "@/design/tokens/tokens.json";

type Theme = "light" | "dark";
type ColorName = keyof typeof tokens.color;

const COLOR_GROUPS: Array<[string, ColorName[]]> = [
  ["زمینه‌ها", ["paper", "raised", "sunken"]],
  ["متن", ["ink", "ink-muted", "ink-subtle"]],
  ["خط‌ها", ["line", "line-strong"]],
  ["لاجورد: تنها رنگ تأکید", ["lapis", "lapis-deep", "lapis-tint", "lapis-text", "on-lapis"]],
  ["زعفران: یک‌بار در هر ناحیه", ["saffron", "on-saffron", "saffron-text", "saffron-tint"]],
  ["وضعیت و تزئین (فیروزه فقط تزئینی است)", ["firouzeh", "success", "success-tint", "danger", "danger-tint"]],
  ["حلقه‌ی فوکوس و پرده", ["focus-ring", "scrim"]],
];

const NAV_LINKS = [
  { label: "نمونه‌کارها", href: "#work" },
  { label: "خدمات", href: "#services" },
  { label: "روش کار", href: "#process" },
  { label: "مشتریان", href: "#clients" },
];

const SAMPLE_LINE = "سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد";

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <h3 id={id} className="gw-t-heading-2 border-b border-line pb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Swatch({ name, theme }: { name: ColorName; theme: Theme }) {
  return (
    <li className="flex flex-col gap-2">
      <span aria-hidden="true" className="block h-16 border border-line-strong" style={{ background: `var(--color-${name})` }} />
      <span dir="ltr" className="text-label font-display text-start text-ink">--color-{name}</span>
      <span dir="ltr" className="text-caption font-display text-start text-ink-subtle">
        {tokens.color[name][theme]}
      </span>
    </li>
  );
}

/** Every token and component, rendered inside one theme (the wrapper's data-theme switches all the variables). */
export function Specimen({ theme }: { theme: Theme }) {
  const types = Object.entries(tokens.type);
  const spaces = Object.entries(tokens.space);
  const radii = Object.entries(tokens.radius);
  const id = (part: string) => `${theme}-${part}`;
  return (
    <section data-theme={theme} id={`theme-${theme}`} aria-labelledby={id("title")} className="bg-paper text-ink">
      <div className="mx-auto flex w-full max-w-[var(--content-max)] flex-col gap-16 px-4 py-16 sm:px-6">
        <header className="flex flex-col gap-2">
          <h2 id={id("title")} className="gw-t-display-md">
            {theme === "light" ? "تم روشن" : "تم تیره"} <span dir="ltr" className="gw-t-heading-3 text-ink-subtle">{theme}</span>
          </h2>
          <p className="gw-t-body text-ink-muted">همه‌ی رنگ‌ها، اندازه‌ها و کامپوننت‌ها از توکن‌های طراحی ساخته شده‌اند؛ در این بخش فقط <code dir="ltr">data-theme=&quot;{theme}&quot;</code> عوض شده است.</p>
        </header>

        <Block id={id("colors")} title="رنگ‌ها">
          <div className="flex flex-col gap-8">
            {COLOR_GROUPS.map(([group, names]) => (
              <div key={group} className="flex flex-col gap-3">
                <h4 className="gw-t-label text-ink-muted">{group}</h4>
                <ul className="grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-5">
                  {names.map((n) => (
                    <Swatch key={n} name={n} theme={theme} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Block>

        <Block id={id("type")} title="حروف و اندازه‌ها">
          <ul className="flex list-none flex-col gap-6 p-0">
            {types.map(([name, spec]) => (
              <li key={name} className="flex flex-col gap-1 border-b border-line pb-4">
                <span dir="ltr" className="text-caption font-display text-start text-ink-subtle">
                  {name} · {spec.size}/{spec.lineHeight} · {spec.weight} · {spec.family}
                </span>
                <span className={`gw-t-${name} text-balance wrap-anywhere`}>{name === "stat" ? "۴۰٪" : SAMPLE_LINE}</span>
              </li>
            ))}
          </ul>
          <p className="gw-prose gw-t-body-lg text-ink-muted">
            متن بلند به این شکل چیده می‌شود: ارتفاع خط دست‌کم ۱٫۹ برابر و عرض ستون حدود ۶۴ نویسه. اعداد فارسی مثل ۱۴۰۵/۰۷/۲۴ و ۰۹۱۲۱۲۳۴۵۶۷ خودکار با ارقام فارسی نمایش داده می‌شوند.
          </p>
        </Block>

        <Block id={id("space")} title="فاصله، شعاع و خط‌ها">
          <ul className="flex list-none flex-col gap-2 p-0">
            {spaces.map(([n, value]) => (
              <li key={n} className="flex items-center gap-4">
                <span dir="ltr" className="text-caption w-40 shrink-0 font-display text-start text-ink-subtle">
                  --space-{n} · {value}
                </span>
                <span aria-hidden="true" className="block h-4 bg-lapis" style={{ inlineSize: `var(--space-${n})` }} />
              </li>
            ))}
          </ul>
          <ul className="flex list-none flex-wrap gap-6 p-0">
            {radii.map(([n, value]) => (
              <li key={n} className="flex flex-col items-center gap-2">
                <span aria-hidden="true" className="block size-20 border border-line-strong bg-sunken" style={{ borderRadius: `var(--radius-${n})` }} />
                <span dir="ltr" className="text-caption font-display text-ink-subtle">
                  radius-{n} · {value}
                </span>
              </li>
            ))}
          </ul>
          <p className="gw-t-body-sm text-ink-muted">قاعده: خط‌های نازک به‌جای سایه. تنها سایه‌ی مجاز، <code dir="ltr">--shadow-overlay</code>، زیر پنجره‌ی نمایش پروژه است (پایین‌تر).</p>
        </Block>

        <Block id={id("buttons")} title="دکمه و تگ">
          <div className="flex flex-wrap items-center gap-3">
            <Button>درخواست مشاوره رایگان</Button>
            <Button variant="secondary">مشاهده نمونه‌کارها</Button>
            <Button variant="quiet" iconEnd="arrow-left">
              مشاهده‌ی جزئیات پروژه
            </Button>
            <Button variant="danger" size="sm" iconStart="trash-2">
              حذف پروژه
            </Button>
            <Button disabled>در حال ارسال…</Button>
            <Button variant="quiet" iconOnly="x" label="بستن" />
            <Button size="sm">ذخیره تغییرات</Button>
          </div>
          <div className="gw-chip-row">
            <Chip>فروشگاه اینترنتی</Chip>
            <Chip variant="outline">Next.js</Chip>
            <Chip variant="filter" selected>
              همه
            </Chip>
            <Chip variant="filter">وب‌سایت</Chip>
            <Chip variant="success">منتشر شده</Chip>
            <Chip variant="warning">پیش‌نویس</Chip>
            <Chip variant="danger">رد شده</Chip>
          </div>
        </Block>

        <Block id={id("fields")} title="فیلد فرم">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="نام و نام خانوادگی" placeholder="مثلاً سارا محمدی" autoComplete="name" />
            <Field label="شماره تماس" type="tel" dir="ltr" defaultValue="۰۹۱۲" hint="فقط برای هماهنگی جلسه تماس می‌گیریم." />
            <Field label="ایمیل" type="email" dir="ltr" defaultValue="sara@" error="یک ایمیل کامل بنویسید، مثل name@site.ir" />
            <Field label="نام شرکت" disabled defaultValue="[نام شرکت]" />
            <div className="sm:col-span-2">
              <Field label="درباره‌ی پروژه‌تان" multiline optional placeholder="چه می‌سازید و چه زمانی به آن نیاز دارید؟" />
            </div>
          </div>
        </Block>

        <Block id={id("content")} title="نتیجه، نظر مشتری و کارت پروژه">
          <div className="grid gap-8 md:grid-cols-3">
            <Metric value="[عدد]٪" label="کاهش زمان ثبت سفارش" source="از پنل مدیریت" sample />
            <Metric value="[عدد]" label="پروژه‌ی تحویل‌شده" source="۱۴۰۰ تا ۱۴۰۴" sample />
            <Metric value="[عدد]" label="روز تا نسخه‌ی اول" source="میانگین پروژه‌ها" sample />
          </div>
          <Testimonial quote="«[متن نظر مشتری اینجا قرار می‌گیرد؛ دو تا چهار خط، بدون ویرایش و با اجازه‌ی کتبی خود او.]»" name="[نام مشتری]" role="مدیر محصول، [نام شرکت]" sample />
          <div className="grid gap-8 md:grid-cols-2">
            <ProjectCard art={2} tags={["فروشگاه اینترنتی", "Next.js"]} title="فروشگاه آنلاین لوازم خانگی" summary="بازطراحی مسیر خرید و پنل مدیریت سفارش‌ها برای یک فروشگاه چندشعبه." />
            <ProjectCard art={3} tags={["سامانه‌ی سازمانی"]} title="داشبورد مدیریت پروژه" summary="ابزار داخلی برای پیگیری کارها، جلسه‌ها و صورت‌حساب‌ها." />
          </div>
        </Block>

        <Block id={id("covers")} title="کاور و علامت برش">
          <p className="gw-t-body-sm text-ink-muted">علامت برش تنها دکوراسیون سامانه است و فقط دور کاور پروژه می‌آید. کاور جایگزین (art ۱ تا ۴) فقط از توکن‌ها ساخته می‌شود؛ تنها art ۱ زعفران دارد.</p>
          <ul className="grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {([1, 2, 3, 4] as const).map((art) => (
              <li key={art}>
                <CropFrame>
                  <CoverArt art={art} sample />
                </CropFrame>
              </li>
            ))}
          </ul>
        </Block>

        <Block id={id("nav")} title="ناوبری">
          <div className="bg-sunken p-4">
            <Navbar className="relative inset-auto" current="#work" links={NAV_LINKS} />
          </div>
        </Block>

        <Block id={id("modal")} title="پنجره‌ی نمونه‌کار">
          <div className="relative h-[64rem] bg-sunken sm:h-[56rem]">
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
        </Block>

        <Block id={id("icons")} title="آیکن‌ها (Lucide، خط ۱٫۵)">
          <ul className="grid list-none grid-cols-3 gap-6 p-0 sm:grid-cols-5 lg:grid-cols-7">
            {ICON_NAMES.map((n) => (
              <li key={n} className="flex flex-col items-center gap-2">
                <Icon name={n} size={24} />
                <span dir="ltr" className="gw-t-caption text-center font-display text-ink-subtle">
                  {n}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </section>
  );
}
