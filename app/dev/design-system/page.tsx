import { Specimen } from "@/components/dev/specimen";

export default function DesignSystemPage() {
  return (
    <main className="bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-[var(--content-max)] flex-col gap-3 px-4 py-10 sm:px-6">
        <h1 className="gw-t-display-md">سامانه‌ی طراحی Grin Web</h1>
        <p className="gw-t-body text-ink-muted">
          صفحه‌ی توسعه‌دهنده: توکن‌ها و کامپوننت‌های ساخته‌شده از <code dir="ltr">design/</code>، در هر دو تم. در محیط تولید وجود ندارد.
        </p>
        <nav aria-label="تم‌ها" className="flex gap-4 gw-t-label">
          <a href="#theme-light">تم روشن</a>
          <a href="#theme-dark">تم تیره</a>
        </nav>
      </header>
      <Specimen theme="light" />
      <Specimen theme="dark" />
    </main>
  );
}
