import type { Metadata } from "next";
import { preload } from "react-dom";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grin Web",
  description: "سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The @font-face rules live in tokens.css (generated from design/tokens.json). Only the weight the first screen needs is
  // preloaded: Estedad SemiBold (the headline). Regular loads with the first body text and swaps in.
  preload("/fonts/Estedad-SemiBold.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
