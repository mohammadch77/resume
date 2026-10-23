import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { devPagesEnabled } from "@/lib/dev-pages";

// Decided per request, not at build time: the production image is built without the flag and must 404 at runtime too.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dev · Grin Web",
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (!devPagesEnabled()) notFound();
  return children;
}
