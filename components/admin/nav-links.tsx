"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string };

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="منوی مدیریت" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              // text-foreground: the design system colours every link lapis (tokens.css); the menu is navigation chrome, not content links.
              "rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2",
              active && "bg-muted font-semibold",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
