"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { createUserAction, updateUserAction } from "@/app/(admin)/admin/(panel)/users/actions";
import { FormRow } from "@/components/admin/form/form-row";
import { useUnsavedWarning } from "@/components/admin/form/use-unsaved-warning";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Outcome } from "@/lib/admin/outcome";
import { PASSWORD_MIN, USER_ROLES, USER_ROLE_LABEL, userCreateSchema, userEditSchema, type UserCreateValues, type UserEditValues } from "@/lib/validation/user";

const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

/** New account: email, name, role and a first password the owner hands over. */
export function CreateUserForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const form = useForm<UserCreateValues>({ resolver: zodResolver(userCreateSchema), defaultValues: { email: "", displayName: "", role: "editor", password: "" } });
  const { register, handleSubmit, setError, formState } = form;
  const { errors, isDirty } = formState;
  useUnsavedWarning(isDirty && !pending);

  const submit = handleSubmit((values) =>
    start(async () => {
      const r = await createUserAction(values);
      if (!r.ok) {
        for (const [field, messages] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof UserCreateValues, { message: messages[0] });
        setOutcome({ kind: "failed", message: r.message });
        return;
      }
      const o = r.data;
      if (o.kind === "failed" && o.field === "email") setError("email", { message: o.message });
      else setOutcome(o);
      if (o.kind === "ok") router.push("/admin/users");
    }),
  );

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-5" noValidate>
      <FormRow label="ایمیل" htmlFor="us-email" error={errors.email?.message} required>
        <Input id="us-email" dir="ltr" inputMode="email" autoComplete="off" aria-invalid={Boolean(errors.email)} {...register("email")} />
      </FormRow>
      <FormRow label="نام" htmlFor="us-name" error={errors.displayName?.message} required>
        <Input id="us-name" aria-invalid={Boolean(errors.displayName)} {...register("displayName")} />
      </FormRow>
      <FormRow label="نقش" htmlFor="us-role" error={errors.role?.message} hint="ویراستار فقط محتوا و درخواست‌ها را مدیریت می‌کند؛ کاربران، گزارش تغییرات و خروجی CSV فقط برای مالک است.">
        <select id="us-role" className={selectClass} {...register("role")}>
          {USER_ROLES.map((r) => <option key={r} value={r}>{USER_ROLE_LABEL[r]}</option>)}
        </select>
      </FormRow>
      <FormRow label="رمز عبور اولیه" htmlFor="us-password" error={errors.password?.message} hint={`دست‌کم ${PASSWORD_MIN.toLocaleString("fa-IR")} نویسه؛ آن را امن به کاربر بدهید.`} required>
        <Input id="us-password" type="password" dir="ltr" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...register("password")} />
      </FormRow>
      <OutcomeMessage outcome={outcome} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>ایجاد کاربر</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>بازگشت</Button>
      </div>
    </form>
  );
}

/** Name and role of an existing account. `selfEdit` locks the role (an owner cannot demote themselves). */
export function EditUserForm({ id, initial, selfEdit }: { id: string; initial: UserEditValues; selfEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const form = useForm<UserEditValues>({ resolver: zodResolver(userEditSchema), defaultValues: initial });
  const { register, handleSubmit, setError, reset, formState } = form;
  const { errors, isDirty } = formState;
  useUnsavedWarning(isDirty && !pending);

  const submit = handleSubmit((values) =>
    start(async () => {
      const r = await updateUserAction({ ...values, id });
      if (!r.ok) {
        for (const [field, messages] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof UserEditValues, { message: messages[0] });
        setOutcome({ kind: "failed", message: r.message });
        return;
      }
      setOutcome(r.data);
      if (r.data.kind === "ok") {
        reset(values);
        router.refresh();
      }
    }),
  );

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-5" noValidate>
      <FormRow label="نام" htmlFor="ue-name" error={errors.displayName?.message} required>
        <Input id="ue-name" aria-invalid={Boolean(errors.displayName)} {...register("displayName")} />
      </FormRow>
      <FormRow label="نقش" htmlFor="ue-role" error={errors.role?.message} hint={selfEdit ? "نقش خودتان را نمی‌توانید عوض کنید." : undefined}>
        <select id="ue-role" className={selectClass} disabled={selfEdit} {...register("role")}>
          {USER_ROLES.map((r) => <option key={r} value={r}>{USER_ROLE_LABEL[r]}</option>)}
        </select>
      </FormRow>
      <OutcomeMessage outcome={outcome} okText="ذخیره شد." />
      <div>
        <Button type="submit" disabled={pending}>ذخیره</Button>
      </div>
    </form>
  );
}
