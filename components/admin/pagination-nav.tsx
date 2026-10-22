import Link from "next/link";
import { totalPages } from "@/lib/admin/pagination";

type Props = { basePath: string; page: number; total: number; pageSize: number; query?: Record<string, string | undefined> };

export function PaginationNav({ basePath, page, total, pageSize, query = {} }: Props) {
  const pages = totalPages(total, pageSize);
  if (pages <= 1) return null;
  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav aria-label="صفحه‌بندی" className="flex items-center justify-between gap-2 text-sm">
      {page > 1 ? <Link href={href(page - 1)}>صفحه‌ی قبل</Link> : <span />}
      <span className="text-muted-foreground">
        صفحه‌ی {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}
      </span>
      {page < pages ? <Link href={href(page + 1)}>صفحه‌ی بعد</Link> : <span />}
    </nav>
  );
}
