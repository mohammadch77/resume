import type { Metadata } from "next";
import { preload } from "react-dom";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grin Web",
  description: "سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The @font-face rules live in tokens.css (generated from the design system). Only the two faces every page needs
  // are preloaded: Vazirmatn UI FD Regular (body) and Estedad ExtraBold (display). SemiBold loads on demand.
  preload("/fonts/Vazirmatn-UI-FD-Regular.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  preload("/fonts/Estedad-ExtraBold.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
