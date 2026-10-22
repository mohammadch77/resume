import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sans = localFont({
  src: [
    { path: "../public/fonts/Vazirmatn-UI-FD-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Vazirmatn-UI-FD-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const display = localFont({
  src: [{ path: "../public/fonts/Estedad-ExtraBold.woff2", weight: "800", style: "normal" }],
  variable: "--font-display",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Grin Web",
  description: "سایت و نرم‌افزاری که کسب‌وکارتان را جلو می‌برد",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
