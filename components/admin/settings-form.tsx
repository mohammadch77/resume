"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { saveSettingsAction } from "@/app/(admin)/admin/(panel)/settings/actions";
import { ConflictDialog } from "@/components/admin/conflict-dialog";
import { FormRow } from "@/components/admin/form/form-row";
import { useUnsavedWarning } from "@/components/admin/form/use-unsaved-warning";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Outcome } from "@/lib/admin/outcome";
import { SOCIAL_KEYS, SOCIAL_NETWORKS, settingsFormSchema, type SettingsFormValues } from "@/lib/validation/settings";

type Props = { version?: number; initial: SettingsFormValues };

export function SettingsForm({ version, initial }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [liveVersion, setLiveVersion] = useState(version);
  const form = useForm<SettingsFormValues>({ resolver: zodResolver(settingsFormSchema), defaultValues: initial });
  const { register, handleSubmit, control, setError, reset, formState } = form;
  const { errors, isDirty } = formState;
  const [heroTitle, heroSubtitle, cta, seoTitle, seoDescription] = useWatch({
    control,
    name: ["heroTitle", "heroSubtitle", "primaryCtaLabel", "seoTitle", "seoDescription"],
  });
  useUnsavedWarning(isDirty && !pending);

  const submit = handleSubmit((values) =>
    start(async () => {
      setSaved(false);
      const r = await saveSettingsAction({ ...values, version: liveVersion });
      if (!r.ok) {
        for (const [field, messages] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof SettingsFormValues, { message: messages[0] });
        setOutcome({ kind: "failed", message: r.message });
        return;
      }
      if (r.data.kind === "conflict") return setConflict(true);
      setOutcome(r.data);
      if (r.data.kind === "ok") {
        setSaved(true);
        setLiveVersion(r.data.value.version); // the next save must carry the version this one produced
        reset(values); // clean again
      }
    }),
  );

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-8" noValidate>
      <section className="flex flex-col gap-5" aria-labelledby="st-brand">
        <h2 id="st-brand" className="text-lg font-semibold">برند و صفحه‌ی اصلی</h2>
        <FormRow label="نام برند" htmlFor="st-brand-name" error={errors.brandName?.message} required>
          <Input id="st-brand-name" aria-invalid={Boolean(errors.brandName)} {...register("brandName")} />
        </FormRow>
        <FormRow label="تیتر صفحه‌ی اصلی" htmlFor="st-hero-title" error={errors.heroTitle?.message} hint="نتیجه‌ای که مشتری می‌گیرد را بنویسید، نه نام شرکت را." required counter={{ value: heroTitle.length, max: 120 }}>
          <Input id="st-hero-title" aria-invalid={Boolean(errors.heroTitle)} {...register("heroTitle")} />
        </FormRow>
        <FormRow label="زیرتیتر" htmlFor="st-hero-sub" error={errors.heroSubtitle?.message} hint="برای چه کسانی و چه چیزی ارائه می‌دهید." required counter={{ value: heroSubtitle.length, max: 300 }}>
          <Textarea id="st-hero-sub" rows={3} aria-invalid={Boolean(errors.heroSubtitle)} {...register("heroSubtitle")} />
        </FormRow>
        <FormRow label="متن دکمه‌ی اصلی" htmlFor="st-cta" error={errors.primaryCtaLabel?.message} hint="نتیجه را بگوید؛ مثال: درخواست مشاوره رایگان." required counter={{ value: cta.length, max: 40 }}>
          <Input id="st-cta" aria-invalid={Boolean(errors.primaryCtaLabel)} {...register("primaryCtaLabel")} />
        </FormRow>
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="st-contact">
        <h2 id="st-contact" className="text-lg font-semibold">اطلاعات تماس</h2>
        <p className="text-sm text-muted-foreground">هر مورد خالی باشد در سایت نمایش داده نمی‌شود.</p>
        <FormRow label="تلفن" htmlFor="st-phone" error={errors.contactPhone?.message} hint="با کد شهر یا موبایل، ۱۱ رقم.">
          <Input id="st-phone" dir="ltr" inputMode="tel" aria-invalid={Boolean(errors.contactPhone)} {...register("contactPhone")} />
        </FormRow>
        <FormRow label="ایمیل" htmlFor="st-email" error={errors.contactEmail?.message}>
          <Input id="st-email" dir="ltr" inputMode="email" aria-invalid={Boolean(errors.contactEmail)} {...register("contactEmail")} />
        </FormRow>
        <FormRow label="نشانی" htmlFor="st-address" error={errors.contactAddress?.message}>
          <Textarea id="st-address" rows={2} aria-invalid={Boolean(errors.contactAddress)} {...register("contactAddress")} />
        </FormRow>
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="st-social">
        <h2 id="st-social" className="text-lg font-semibold">شبکه‌های اجتماعی</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {SOCIAL_KEYS.map((key) => (
            <FormRow key={key} label={SOCIAL_NETWORKS[key]} htmlFor={`st-social-${key}`} error={errors.socials?.[key]?.message}>
              <Input id={`st-social-${key}`} dir="ltr" inputMode="url" placeholder="https://" aria-invalid={Boolean(errors.socials?.[key])} {...register(`socials.${key}`)} />
            </FormRow>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="st-seo">
        <h2 id="st-seo" className="text-lg font-semibold">سئو (پیش‌فرض سایت)</h2>
        <FormRow label="عنوان سئو" htmlFor="st-seo-title" error={errors.seoTitle?.message} hint="خالی = نام برند." counter={{ value: seoTitle.length, max: 70 }}>
          <Input id="st-seo-title" aria-invalid={Boolean(errors.seoTitle)} {...register("seoTitle")} />
        </FormRow>
        <FormRow label="توضیح سئو" htmlFor="st-seo-desc" error={errors.seoDescription?.message} hint="خالی = همان زیرتیتر." counter={{ value: seoDescription.length, max: 160 }}>
          <Textarea id="st-seo-desc" rows={2} aria-invalid={Boolean(errors.seoDescription)} {...register("seoDescription")} />
        </FormRow>
      </section>

      <OutcomeMessage outcome={outcome} okText="تنظیمات ذخیره شد." />
      {saved && outcome === null ? <p role="status" className="text-sm text-muted-foreground">تنظیمات ذخیره شد.</p> : null}
      <div>
        <Button type="submit" disabled={pending}>ذخیره‌ی تنظیمات</Button>
      </div>
      <ConflictDialog open={conflict} onClose={() => setConflict(false)} onReload={() => router.refresh()} />
    </form>
  );
}
