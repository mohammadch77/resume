"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { saveClientAction } from "@/app/(admin)/admin/(panel)/clients/actions";
import { FormRow } from "@/components/admin/form/form-row";
import { useUnsavedWarning } from "@/components/admin/form/use-unsaved-warning";
import { MediaPicker } from "@/components/admin/media-picker";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Outcome } from "@/lib/admin/outcome";
import type { PickerOption } from "@/lib/media/picker";
import { clientFormSchema, type ClientFormValues } from "@/lib/validation/client";

type Props = {
  id?: string;
  initial?: ClientFormValues;
  industries: Array<{ id: string; name: string }>;
  logos: PickerOption[];
};

const EMPTY: ClientFormValues = { name: "", slug: "", industryId: "", logoMediaId: "", websiteUrl: "", showNamePublicly: false };

export function ClientForm({ id, initial = EMPTY, industries, logos }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const form = useForm<ClientFormValues>({ resolver: zodResolver(clientFormSchema), defaultValues: initial });
  const { register, handleSubmit, control, setError, formState } = form;
  const { errors, isDirty } = formState;
  const name = useWatch({ control, name: "name" });
  useUnsavedWarning(isDirty && !pending);

  const submit = handleSubmit((values) =>
    start(async () => {
      const r = await saveClientAction({ ...values, id });
      if (!r.ok) {
        for (const [field, messages] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof ClientFormValues, { message: messages[0] });
        setOutcome({ kind: "failed", message: r.message });
        return;
      }
      const o = r.data;
      if (o.kind === "failed" && o.field && o.field in EMPTY) setError(o.field as keyof ClientFormValues, { message: o.message });
      else setOutcome(o);
      if (o.kind === "ok") router.push("/admin/clients");
    }),
  );

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-5" noValidate>
      <FormRow label="نام مشتری" htmlFor="cl-name" error={errors.name?.message} required counter={{ value: name.length, max: 120 }}>
        <Input id="cl-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
      </FormRow>
      <FormRow label="نشانی (slug)" htmlFor="cl-slug" error={errors.slug?.message} hint="لاتین، مثال: acme" required>
        <Input id="cl-slug" dir="ltr" aria-invalid={Boolean(errors.slug)} {...register("slug")} />
      </FormRow>
      <FormRow label="حوزه‌ی کاری" htmlFor="cl-industry" error={errors.industryId?.message}>
        <select id="cl-industry" className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm" {...register("industryId")}>
          <option value="">مشخص نشده</option>
          {industries.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="وب‌سایت" htmlFor="cl-website" error={errors.websiteUrl?.message} hint="با https:// شروع شود؛ می‌تواند خالی باشد.">
        <Input id="cl-website" dir="ltr" inputMode="url" aria-invalid={Boolean(errors.websiteUrl)} {...register("websiteUrl")} />
      </FormRow>
      <Controller
        control={control}
        name="logoMediaId"
        render={({ field }) => (
          <MediaPicker name="cl-logo" label="لوگو (فقط تصویر)" options={logos} value={field.value} onChange={field.onChange} noneLabel="بدون لوگو" error={errors.logoMediaId?.message} />
        )}
      />
      <Controller
        control={control}
        name="showNamePublicly"
        render={({ field }) => (
          <div className="flex items-start gap-2">
            <Checkbox id="cl-public" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            <label htmlFor="cl-public" className="text-sm">
              نام و لوگوی این مشتری در سایت نمایش داده شود (فقط با اجازه‌ی مشتری)
            </label>
          </div>
        )}
      />
      <OutcomeMessage outcome={outcome} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {id ? "ذخیره‌ی تغییرات" : "ایجاد مشتری"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/clients")}>
          بازگشت
        </Button>
      </div>
    </form>
  );
}
