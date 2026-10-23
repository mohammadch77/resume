"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { updateLeadAction } from "@/app/(admin)/admin/(panel)/leads/actions";
import { FormRow } from "@/components/admin/form/form-row";
import { useUnsavedWarning } from "@/components/admin/form/use-unsaved-warning";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Outcome } from "@/lib/admin/outcome";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, leadUpdateSchema, type LeadUpdateValues } from "@/lib/validation/lead";

/** Status and internal notes of one lead. The visitor's own words are shown above it, read-only. */
export function LeadForm({ id, initial }: { id: string; initial: LeadUpdateValues }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const form = useForm<LeadUpdateValues>({ resolver: zodResolver(leadUpdateSchema), defaultValues: initial });
  const { register, handleSubmit, control, setError, reset, formState } = form;
  const { errors, isDirty } = formState;
  const notes = useWatch({ control, name: "internalNotes" });
  useUnsavedWarning(isDirty && !pending);

  const submit = handleSubmit((values) =>
    start(async () => {
      const r = await updateLeadAction({ ...values, id });
      if (!r.ok) {
        for (const [field, messages] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof LeadUpdateValues, { message: messages[0] });
        setOutcome({ kind: "failed", message: r.message });
        return;
      }
      setOutcome(r.data);
      if (r.data.kind === "ok") {
        reset(values); // saved: the form is clean again
        router.refresh();
      }
    }),
  );

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-5" noValidate>
      <FormRow label="وضعیت" htmlFor="ld-status" error={errors.status?.message}>
        <select id="ld-status" className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm" {...register("status")}>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
        </select>
      </FormRow>
      <FormRow label="یادداشت داخلی" htmlFor="ld-notes" error={errors.internalNotes?.message} hint="فقط تیم می‌بیند؛ در سایت نمایش داده نمی‌شود." counter={{ value: notes.length, max: 4000 }}>
        <Textarea id="ld-notes" rows={5} aria-invalid={Boolean(errors.internalNotes)} {...register("internalNotes")} />
      </FormRow>
      <OutcomeMessage outcome={outcome} okText="ذخیره شد." />
      <div>
        <Button type="submit" disabled={pending}>ذخیره</Button>
      </div>
    </form>
  );
}
