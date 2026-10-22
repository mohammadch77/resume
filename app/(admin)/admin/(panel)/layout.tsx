import { LogoutButton } from "@/components/admin/logout-button";
import { NavLinks, type NavItem } from "@/components/admin/nav-links";
import { requireRole } from "@/lib/auth/require-role";

const COMMON: NavItem[] = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/projects", label: "پروژه‌ها" },
  { href: "/admin/clients", label: "مشتریان" },
  { href: "/admin/services", label: "خدمات" },
  { href: "/admin/testimonials", label: "نظرات مشتریان" },
  { href: "/admin/media", label: "رسانه" },
  { href: "/admin/leads", label: "درخواست‌ها" },
  { href: "/admin/settings", label: "تنظیمات" },
];
const OWNER_ONLY: NavItem[] = [
  { href: "/admin/users", label: "کاربران" },
  { href: "/admin/audit", label: "گزارش تغییرات" },
];

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole("owner", "editor");
  const items = user.role === "owner" ? [...COMMON, ...OWNER_ONLY] : COMMON;
  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <aside className="flex flex-col gap-6 border-b p-4 md:w-60 md:border-b-0 md:border-e">
        <p className="text-lg font-semibold">پنل مدیریت</p>
        <NavLinks items={items} />
        <div className="mt-auto flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{user.displayName}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
