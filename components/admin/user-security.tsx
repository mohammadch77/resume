"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { resetPasswordAction, unlockUserAction } from "@/app/(admin)/admin/(panel)/users/actions";
import { FormRow } from "@/components/admin/form/form-row";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Outcome } from "@/lib/admin/outcome";
import { PASSWORD_MIN, passwordResetSchema, type PasswordResetValues } from "@/lib/validation/user";

/** Reset password (ends all of the user's sessions) and clear a login lockout. */
export function UserSecurity({ id, locked, isSelf }: { id: string; locked: boolean; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const form = useForm<PasswordResetValues>({ resolver: zodResolver(passwordResetSchema), defaultValues: { password: "" } });
  const { register, handleSubmit, setError, reset, formState } = form;

  const submit = handleSubmit((values) =>
    start(async () => {
      const r = await resetPasswordAction({ ...values, id });
      if (!r.ok) {
        for (const [field, messages] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof PasswordResetValues, { message: messages[0] });
        setOutcome({ kind: "failed", message: r.message });
        return;
      }
      setOutcome(r.data);
      if (r.data.kind === "ok") reset({ password: "" });
    }),
  );

  return (
    <section aria-labelledby="us-security" className="flex max-w-xl flex-col gap-5">
      <h2 id="us-security" className="text-lg font-semibold">امنیت حساب</h2>
      {locked ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
          <span>این حساب به‌دلیل ورودهای ناموفق قفل شده است.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => start(async () => { const r = await unlockUserAction({ id }); setUnlocked(r.ok && r.data.kind === "ok"); })}
          >
            باز کردن قفل
          </Button>
          {unlocked ? <span role="status">قفل باز شد.</span> : null}
        </div>
      ) : null}
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <FormRow
          label="رمز عبور جدید"
          htmlFor="us-new-password"
          error={formState.errors.password?.message}
          hint={`دست‌کم ${PASSWORD_MIN.toLocaleString("fa-IR")} نویسه. با تغییر رمز، همه‌ی نشست‌های این کاربر بسته می‌شود${isSelf ? " (شما هم باید دوباره وارد شوید)" : ""}.`}
        >
          <Input id="us-new-password" type="password" dir="ltr" autoComplete="new-password" aria-invalid={Boolean(formState.errors.password)} {...register("password")} />
        </FormRow>
        <OutcomeMessage outcome={outcome} okText="رمز عبور عوض شد و نشست‌های قبلی بسته شد." />
        <div>
          <Button type="submit" variant="outline" disabled={pending}>تغییر رمز عبور</Button>
        </div>
      </form>
    </section>
  );
}
