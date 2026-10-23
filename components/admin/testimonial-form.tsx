"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { saveTestimonialAction } from "@/app/(admin)/admin/(panel)/testimonials/actions";
import { ConflictDialog } from "@/components/admin/conflict-dialog";
import { FormRow } from "@/components/admin/form/form-row";
import { useUnsavedWarning } from "@/components/admin/form/use-unsaved-warning";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Outcome } from "@/lib/admin/outcome";
import { testimonialFormSchema, type TestimonialFormValues } from "@/lib/validation/testimonial";

type Choice = { id: string; name: string };
type Props = { id?: string; version?: number; initial?: TestimonialFormValues; clients: Choice[]; projects: Choice[] };

const EMPTY: TestimonialFormValues = { clientId: "", projectId: "", authorName: "", authorRole: "", quote: "", consentConfirmed: false };
const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

export function TestimonialForm({ id, version, initial = EMPTY, clients, projects }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const [conflict, setConflict] = useState(false);
  const form = useForm<TestimonialFormValues>({ resolver: zodResolver(testimonialFormSchema), defaultValues: initial });
  const { register, handleSubmit, control, setError, formState } = form;
  const { errors, isDirty } = formState;
  const quote = useWatch({ control, name: "quote" });
  useUnsavedWarning(isDirty && !pending);

  const submit = handleSubmit((values) =>
    start(async () => {
      const r = await saveTestimonialAction({ ...values, id, version });
      if (!r.ok) {
        for (const [field, messages] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof TestimonialFormValues, { message: messages[0] });
        setOutcome({ kind: "failed", message: r.message });
        return;
      }
      const o = r.data;
      if (o.kind === "conflict") return setConflict(true);
      setOutcome(o);
      if (o.kind === "ok") router.push("/admin/testimonials");
    }),
  );

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-5" noValidate>
      <FormRow label="مشتری" htmlFor="tm-client" error={errors.clientId?.message} required>
        <select id="tm-client" className={selectClass} {...register("clientId")}>
          <option value="">انتخاب کنید</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="درباره‌ی کدام پروژه؟" htmlFor="tm-project" error={errors.projectId?.message} hint="می‌تواند خالی باشد.">
        <select id="tm-project" className={selectClass} {...register("projectId")}>
          <option value="">پروژه‌ی مشخصی نیست</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </FormRow>
      <FormRow label="نام گوینده" htmlFor="tm-author" error={errors.authorName?.message} required>
        <Input id="tm-author" aria-invalid={Boolean(errors.authorName)} {...register("authorName")} />
      </FormRow>
      <FormRow label="سمت" htmlFor="tm-role" error={errors.authorRole?.message} hint="مثال: مدیر بازاریابی؛ می‌تواند خالی باشد.">
        <Input id="tm-role" aria-invalid={Boolean(errors.authorRole)} {...register("authorRole")} />
      </FormRow>
      <FormRow label="متن نظر" htmlFor="tm-quote" error={errors.quote?.message} required counter={{ value: quote.length, max: 600 }}>
        <Textarea id="tm-quote" rows={5} aria-invalid={Boolean(errors.quote)} {...register("quote")} />
      </FormRow>
      <Controller
        control={control}
        name="consentConfirmed"
        render={({ field }) => (
          <div className="flex items-start gap-2">
            <Checkbox id="tm-consent" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            <label htmlFor="tm-consent" className="text-sm">
              رضایت مشتری برای انتشار این نظر (با نام و سمت بالا) را گرفته‌ام. بدون این تأیید نظر منتشر نمی‌شود.
            </label>
          </div>
        )}
      />
      <OutcomeMessage outcome={outcome} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{id ? "ذخیره‌ی تغییرات" : "ثبت نظر"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/testimonials")}>بازگشت</Button>
      </div>
      <ConflictDialog open={conflict} onClose={() => setConflict(false)} onReload={() => router.refresh()} />
    </form>
  );
}
