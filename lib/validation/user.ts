import { z } from "zod";
import { requiredText } from "./common";

export const USER_ROLES = ["owner", "editor"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const USER_ROLE_LABEL: Record<UserRole, string> = { owner: "مالک", editor: "ویراستار" };

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/** Length is what matters (NIST 800-63B); a very long limit only stops absurd inputs from reaching the hasher. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `رمز عبور دست‌کم ${PASSWORD_MIN.toLocaleString("fa-IR")} نویسه باشد.`)
  .max(PASSWORD_MAX, `رمز عبور حداکثر ${PASSWORD_MAX.toLocaleString("fa-IR")} نویسه باشد.`);

const email = z.email("ایمیل را درست بنویسید.").max(254, "ایمیل خیلی طولانی است.");

export const userCreateSchema = z
  .object({
    email,
    displayName: requiredText("نام", 80),
    role: z.enum(USER_ROLES),
    password: passwordSchema,
  })
  .refine((v) => v.password.toLowerCase() !== v.email.toLowerCase(), { path: ["password"], message: "رمز عبور نباید همان ایمیل باشد." });

export type UserCreateValues = z.infer<typeof userCreateSchema>;

export const userEditSchema = z.object({
  displayName: requiredText("نام", 80),
  role: z.enum(USER_ROLES),
});

export type UserEditValues = z.infer<typeof userEditSchema>;

export const passwordResetSchema = z.object({ password: passwordSchema });
export type PasswordResetValues = z.infer<typeof passwordResetSchema>;
