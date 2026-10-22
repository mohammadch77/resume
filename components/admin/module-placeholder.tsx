import { requireRole, type Role } from "@/lib/auth/require-role";

/** Shell page for a module whose CRUD arrives in Phase 4. Still enforces the role. */
export async function ModulePlaceholder({ title, roles = ["owner", "editor"] }: { title: string; roles?: Role[] }) {
  await requireRole(...roles);
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">این بخش در مرحله‌ی بعد ساخته می‌شود.</p>
    </div>
  );
}
