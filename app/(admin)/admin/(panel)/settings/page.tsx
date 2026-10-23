import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { isSampleText } from "@/lib/admin/sample-content";
import { getSettings } from "@/lib/admin/settings";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import type { SettingsFormValues } from "@/lib/validation/settings";
import { SOCIAL_KEYS } from "@/lib/validation/settings";

export const metadata: Metadata = { title: "تنظیمات" };

const BLANK: SettingsFormValues = {
  brandName: "Grin Web",
  heroTitle: "",
  heroSubtitle: "",
  primaryCtaLabel: "درخواست مشاوره رایگان",
  contactPhone: "",
  contactEmail: "",
  contactAddress: "",
  socials: Object.fromEntries(SOCIAL_KEYS.map((k) => [k, ""])) as SettingsFormValues["socials"],
  seoTitle: "",
  seoDescription: "",
};

export default async function SettingsPage() {
  await requireRole("owner", "editor");
  const current = await getSettings(getDb());
  const sampleText = current ? isSampleText(current.values.heroSubtitle) || isSampleText(current.values.heroTitle) : false;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">تنظیمات سایت</h1>
      {!current ? <p className="rounded-md border p-3 text-sm">هنوز تنظیماتی ذخیره نشده است. فرم زیر را پر کنید تا سایت متن‌های خود را از اینجا بخواند.</p> : null}
      {sampleText ? (
        <p role="status" className="rounded-md border border-destructive p-3 text-sm">
          متن صفحه‌ی اصلی هنوز «نمونه» است. پیش از راه‌اندازی آن را با متن واقعی جایگزین کنید.
        </p>
      ) : null}
      {/* key = version: after a save or a conflict reload the form remounts with the stored values */}
      <SettingsForm key={current?.version ?? 0} version={current?.version} initial={current?.values ?? BLANK} />
    </div>
  );
}
