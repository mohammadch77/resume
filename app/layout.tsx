import type { Metadata } from "next";
import { preload } from "react-dom";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grin Web",
  description: "سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The @font-face rules live in tokens.css (generated from design/tokens.json). Both Estedad faces are preloaded: SemiBold is the headline,
  // Regular the hero's lead text. With only SemiBold preloaded, Regular swapped in ~200 ms after first paint, the lead lost a line and the
  // monitor below it moved 34 px (CLS 0.018 of the 0.02 hard limit, measured). A preload costs ~32 KB each, fetched beside the CSS.
  preload("/fonts/Estedad-SemiBold.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload("/fonts/Estedad-Regular.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
