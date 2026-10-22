import type { Metadata } from "next";

// Nonce CSP only works on per-request rendering; a prerendered page would ship scripts without the nonce.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "پنل مدیریت", template: "%s · پنل مدیریت" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
