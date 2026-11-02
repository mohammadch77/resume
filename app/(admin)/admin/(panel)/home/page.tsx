import type { Metadata } from "next";
import { HomeEditor } from "@/components/admin/home-editor";
import { getHomeAdmin, listCards, listPartnerNames, listStats } from "@/lib/admin/home";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";
import { listPickerOptions } from "@/lib/media/picker";
import { HOME_IMAGE_MIMES } from "@/lib/validation/home";

export const metadata: Metadata = { title: "محتوای صفحه‌ی اصلی" };

export default async function HomeContentPage() {
  await requireRole("owner", "editor");
  const db = getDb();
  const [home, cards, stats, partners, images] = await Promise.all([getHomeAdmin(db), listCards(db), listStats(db), listPartnerNames(db), listPickerOptions(db, ["image"], 200, [...HOME_IMAGE_MIMES])]);
  if (!home) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">محتوای صفحه‌ی اصلی</h1>
        <p role="alert" className="rounded-md border border-destructive p-3 text-sm">ردیف محتوای صفحه‌ی اصلی در پایگاه‌داده نیست. مهاجرت‌ها (npm run db:migrate) را اجرا کنید.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">محتوای صفحه‌ی اصلی</h1>
      <p className="text-sm text-muted-foreground">همه‌ی متن‌ها، تصویرها، کارت‌ها و آمار صفحه‌ی اصلی، به ترتیب خود صفحه. تغییرها پس از ذخیره روی سایت می‌آیند. برند، تلفن، شبکه‌ها و متن دکمه‌ی اصلی در «تنظیمات» است.</p>
      {/* No key (the settings form's lesson): an action that expires a cache tag re-renders this page; the editor tracks its own version. */}
      <HomeEditor version={home.version} initial={home.values} images={images} cards={cards} stats={stats} partners={partners} />
    </div>
  );
}
