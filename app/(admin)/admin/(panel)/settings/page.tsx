import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export const metadata: Metadata = { title: "تنظیمات" };

export default function Page() {
  return <ModulePlaceholder title="تنظیمات" />;
}
