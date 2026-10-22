import type { z, ZodType } from "zod";
import type { Db } from "@/lib/db/client";
import { withActor, type Tx } from "@/lib/db/with-actor";
import { isAllowedOrigin } from "./request";
import type { SessionUser } from "./session";

export type ActionCode = "unauthenticated" | "forbidden" | "bad_origin" | "invalid_input";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ActionCode; message: string; fieldErrors?: Record<string, string[]> };

export type ActionContext = {
  db: Db;
  user: SessionUser | null;
  origin: string | null;
  siteOrigin: string;
  requestId: string;
};

const MESSAGES: Record<ActionCode, string> = {
  unauthenticated: "برای ادامه وارد شوید.",
  forbidden: "اجازه‌ی انجام این کار را ندارید.",
  bad_origin: "درخواست نامعتبر است. صفحه را دوباره بارگذاری کنید.",
  invalid_input: "اطلاعات واردشده درست نیست.",
};

const fail = (code: ActionCode, fieldErrors?: Record<string, string[]>): ActionResult<never> => ({
  ok: false,
  code,
  message: MESSAGES[code],
  fieldErrors,
});

/**
 * The single gate every admin mutation passes through, in this order:
 * Origin check -> authentication -> role -> Zod validation -> transaction with the actor set (audit).
 */
export async function runAdminAction<S extends ZodType, T>(
  ctx: ActionContext,
  opts: { roles: SessionUser["role"][]; schema: S },
  input: unknown,
  handler: (args: { tx: Tx; user: SessionUser; input: z.output<S> }) => Promise<T>,
): Promise<ActionResult<T>> {
  if (!isAllowedOrigin(ctx.origin, ctx.siteOrigin)) return fail("bad_origin");
  if (!ctx.user) return fail("unauthenticated");
  if (!opts.roles.includes(ctx.user.role)) return fail("forbidden");
  const parsed = opts.schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return fail("invalid_input", fieldErrors);
  }
  const user = ctx.user;
  const data = await withActor(ctx.db, user.id, ctx.requestId, (tx) => handler({ tx, user, input: parsed.data }));
  return { ok: true, data };
}
