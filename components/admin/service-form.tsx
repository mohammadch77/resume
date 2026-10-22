"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { saveServiceAction } from "@/app/(admin)/admin/(panel)/services/actions";
import { ConflictDialog } from "@/components/admin/conflict-dialog";
import { FormRow } from "@/components/admin/form/form-row";
import { useUnsavedWarning } from "@/components/admin/form/use-unsaved-warning";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Outcome } from "@/lib/admin/outcome";
import { SERVICE_ICONS } from "@/lib/validation/common";
import { serviceFormSchema, type ServiceFormValues } from "@/lib/validation/service";

type Props = { id?: string; version?: number; initial?: ServiceFormValues };

const EMPTY: ServiceFormValues = { title: "", slug: "", summary: "", iconKey: SERVICE_ICONS[0] };

export function ServiceForm({ id, version, initial = EMPTY }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const [conflict, setConflict] = useState(false);
  const form = useForm<ServiceFormValues>({ resolver: zodResolver(serviceFormSchema), defaultValues: initial });
  const { register, handleSubmit, control, setError, formState } = form;
  const [title, summary] = useWatch({ control, name: ["title", "summary"] });
  const { errors, isDirty } = formState;
  useUnsavedWarning(isDirty && !pending);

  const submit = handleSubmit((values) =>
    start(async () => {
      const r = await saveServiceAction({ ...values, id, version });
      if (!r.ok) {
        for (const [field, messages] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof ServiceFormValues, { message: messages[0] });
        setOutcome({ kind: "failed", message: r.message });
        return;
      }
      const o = r.data;
      if (o.kind === "conflict") return setConflict(true);
      if (o.kind === "failed" && o.field && o.field in EMPTY) setError(o.field as keyof ServiceFormValues, { message: o.message });
      else setOutcome(o);
      if (o.kind === "ok") router.push("/admin/services");
    }),
  );

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-5" noValidate>
      <FormRow label="عنوان" htmlFor="svc-title" error={errors.title?.message} required counter={{ value: title.length, max: 120 }}>
        <Input id="svc-title" aria-invalid={Boolean(errors.title)} {...register("title")} />
      </FormRow>
      <FormRow label="نشانی (slug)" htmlFor="svc-slug" error={errors.slug?.message} hint="لاتین، مثال: web-design" required>
        <Input id="svc-slug" dir="ltr" aria-invalid={Boolean(errors.slug)} {...register("slug")} />
      </FormRow>
      <FormRow label="توضیح کوتاه" htmlFor="svc-summary" error={errors.summary?.message} required counter={{ value: summary.length, max: 500 }}>
        <Textarea id="svc-summary" rows={4} aria-invalid={Boolean(errors.summary)} {...register("summary")} />
      </FormRow>
      <FormRow label="آیکن" htmlFor="svc-icon" error={errors.iconKey?.message}>
        <select id="svc-icon" dir="ltr" className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm" {...register("iconKey")}>
          {SERVICE_ICONS.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
      </FormRow>
      <OutcomeMessage outcome={outcome} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {id ? "ذخیره‌ی تغییرات" : "ایجاد خدمت"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/services")}>
          بازگشت
        </Button>
      </div>
      <ConflictDialog open={conflict} onClose={() => setConflict(false)} onReload={() => router.refresh()} />
    </form>
  );
}
