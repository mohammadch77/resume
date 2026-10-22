import type { Metadata } from "next";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { listTaxonomy } from "@/lib/admin/taxonomy";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "دسته‌بندی‌ها" };

export default async function CategoriesPage() {
  await requireRole("owner", "editor");
  const db = getDb();
  const [industryRows, techRows] = await Promise.all([listTaxonomy(db, "industry"), listTaxonomy(db, "tech")]);
  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold">دسته‌بندی‌ها</h1>
      <TaxonomyManager kind="industry" title="حوزه‌های کاری (صنعت)" rows={industryRows} />
      <TaxonomyManager kind="tech" title="فناوری‌ها" rows={techRows} />
    </div>
  );
}
