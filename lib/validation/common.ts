import { z } from "zod";

/**
 * Field rules shared by the admin forms (client-side) and the server actions. They mirror the CHECK constraints in
 * drizzle/migrations/0001_schema.sql, which stay the last line of defence. Optional text fields use "" for "empty";
 * `blankToNull` converts at the boundary so Zod input and output types are identical (simple for react-hook-form).
 */
export const slugSchema = z
  .string()
  .trim()
  .min(1, "نشانی (slug) را بنویسید.")
  .max(80, "نشانی حداکثر ۸۰ حرف باشد.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "فقط حروف کوچک لاتین، عدد و خط تیره؛ مثال: online-store");

export const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} را بنویسید.`).max(max, `${label} حداکثر ${max.toLocaleString("fa-IR")} حرف باشد.`);

export const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} حداکثر ${max.toLocaleString("fa-IR")} حرف باشد.`);

export const optionalHttpsUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(2048, `${label} خیلی طولانی است.`)
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), `${label} باید با https:// شروع شود.`);

export const uuidSchema = z.uuid("شناسه نامعتبر است.");
export const optionalUuid = z.union([z.literal(""), z.uuid("شناسه نامعتبر است.")]);

export const versionSchema = z.number().int().min(1);

export const blankToNull = (v: string): string | null => (v.trim() === "" ? null : v.trim());

/** Icons offered for services (Lucide names, 1.5px stroke). Keep in sync with the icon map used on the landing (Phase 5). */
export const SERVICE_ICONS = ["globe", "shopping-cart", "code", "life-buoy", "smartphone", "database", "shield-check", "layout-dashboard", "workflow", "search", "gauge", "palette"] as const;
