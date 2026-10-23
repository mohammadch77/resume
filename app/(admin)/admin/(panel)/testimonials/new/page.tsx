import type { Metadata } from "next";
import { TestimonialForm } from "@/components/admin/testimonial-form";
import { listClients } from "@/lib/admin/clients";
import { listProjectChoices } from "@/lib/admin/testimonials";
import { requireRole } from "@/lib/auth/require-role";
import { getDb } from "@/lib/db/client";

export const metadata: Metadata = { title: "نظر جدید" };

export default async function NewTestimonialPage() {
  await requireRole("owner", "editor");
  const db = getDb();
  const [clients, projects] = await Promise.all([listClients(db), listProjectChoices(db)]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">نظر جدید</h1>
      <TestimonialForm clients={clients.map((c) => ({ id: c.id, name: c.name }))} projects={projects} />
    </div>
  );
}
