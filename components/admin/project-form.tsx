"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { saveProjectAction } from "@/app/(admin)/admin/(panel)/projects/actions";
import { ConflictDialog } from "@/components/admin/conflict-dialog";
import { FormRow } from "@/components/admin/form/form-row";
import { useUnsavedWarning } from "@/components/admin/form/use-unsaved-warning";
import { MediaPicker } from "@/components/admin/media-picker";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Outcome } from "@/lib/admin/outcome";
import type { PickerOption } from "@/lib/media/picker";
import { MAX_GALLERY, MAX_METRICS, projectFormSchema, type ProjectFormValues } from "@/lib/validation/project";

type Choice = { id: string; name: string };

type Props = {
  id?: string;
  version?: number;
  initial?: ProjectFormValues;
  industries: Choice[];
  clients: Choice[];
  services: Choice[];
  techTags: Choice[];
  images: PickerOption[];
  /** Images and videos, for the gallery. */
  gallery: PickerOption[];
};

const EMPTY: ProjectFormValues = {
  title: "", slug: "", clientId: "", industryId: "", summary: "", challenge: "", solution: "", outcome: "",
  completedOn: "", liveUrl: "", coverMediaId: "", isFeatured: false, seoTitle: "", seoDescription: "",
  serviceIds: [], techTagIds: [], gallery: [], metrics: [],
};

const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

function CheckGroup({ legend, choices, value, onChange, error }: { legend: string; choices: Choice[]; value: string[]; onChange: (next: string[]) => void; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {choices.length === 0 ? <p className="text-sm text-muted-foreground">موردی تعریف نشده است.</p> : null}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {choices.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-sm">
            <Checkbox checked={value.includes(c.id)} onCheckedChange={(on) => onChange(on === true ? [...value, c.id] : value.filter((v) => v !== c.id))} />
            {c.name}
          </label>
        ))}
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </fieldset>
  );
}

export function ProjectForm({ id, version, initial = EMPTY, industries, clients, services, techTags, images, gallery: galleryChoices }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const [conflict, setConflict] = useState(false);
  const form = useForm<ProjectFormValues>({ resolver: zodResolver(projectFormSchema), defaultValues: initial });
  const { register, handleSubmit, control, setError, formState } = form;
  const { errors, isDirty } = formState;
  const gallery = useFieldArray({ control, name: "gallery" });
  const metrics = useFieldArray({ control, name: "metrics" });
  const [title, summary, seoTitle, seoDescription, galleryItems] = useWatch({ control, name: ["title", "summary", "seoTitle", "seoDescription", "gallery"] });
  useUnsavedWarning(isDirty && !pending);
  const byId = new Map(galleryChoices.map((o) => [o.id, o]));

  const submit = handleSubmit((values) =>
    start(async () => {
      const r = await saveProjectAction({ ...values, id, version });
      if (!r.ok) {
        for (const [field, messages] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof ProjectFormValues, { message: messages[0] });
        setOutcome({ kind: "failed", message: r.message });
        return;
      }
      const o = r.data;
      if (o.kind === "conflict") return setConflict(true);
      if (o.kind === "failed" && o.field && o.field in EMPTY) setError(o.field as keyof ProjectFormValues, { message: o.message });
      else setOutcome(o);
      if (o.kind === "ok") router.push(id ? "/admin/projects" : `/admin/projects/${o.value.id}`);
    }),
  );

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-8" noValidate>
      <section className="flex flex-col gap-5" aria-labelledby="pf-basics">
        <h2 id="pf-basics" className="text-lg font-semibold">اطلاعات اصلی</h2>
        <FormRow label="عنوان" htmlFor="pf-title" error={errors.title?.message} required counter={{ value: title.length, max: 120 }}>
          <Input id="pf-title" aria-invalid={Boolean(errors.title)} {...register("title")} />
        </FormRow>
        <FormRow label="نشانی (slug)" htmlFor="pf-slug" error={errors.slug?.message} hint="لاتین؛ نشانی صفحه‌ی /work/… از آن ساخته می‌شود." required>
          <Input id="pf-slug" dir="ltr" aria-invalid={Boolean(errors.slug)} {...register("slug")} />
        </FormRow>
        <FormRow label="خلاصه" htmlFor="pf-summary" error={errors.summary?.message} hint="برای انتشار دست‌کم ۲۰ و حداکثر ۲۸۰ حرف." required counter={{ value: summary.length, max: 280 }}>
          <Textarea id="pf-summary" rows={3} aria-invalid={Boolean(errors.summary)} {...register("summary")} />
        </FormRow>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="حوزه‌ی کاری" htmlFor="pf-industry" error={errors.industryId?.message} required>
            <select id="pf-industry" className={selectClass} {...register("industryId")}>
              <option value="">انتخاب کنید</option>
              {industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="مشتری" htmlFor="pf-client" error={errors.clientId?.message} hint="خالی = مشتری نمایش داده نشود.">
            <select id="pf-client" className={selectClass} {...register("clientId")}>
              <option value="">بدون مشتری</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="تاریخ تحویل (شمسی)" htmlFor="pf-date" error={errors.completedOn?.message} hint="مثال: ۱۴۰۴/۰۵/۱۲؛ می‌تواند خالی باشد.">
            <Input id="pf-date" dir="ltr" inputMode="numeric" aria-invalid={Boolean(errors.completedOn)} {...register("completedOn")} />
          </FormRow>
          <FormRow label="نشانی پروژه‌ی زنده" htmlFor="pf-live" error={errors.liveUrl?.message} hint="با https:// شروع شود؛ می‌تواند خالی باشد.">
            <Input id="pf-live" dir="ltr" inputMode="url" aria-invalid={Boolean(errors.liveUrl)} {...register("liveUrl")} />
          </FormRow>
        </div>
        <Controller control={control} name="isFeatured" render={({ field }) => (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            پروژه‌ی ویژه (در بخش نمونه‌کارها اول نمایش داده شود)
          </label>
        )} />
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="pf-story">
        <h2 id="pf-story" className="text-lg font-semibold">داستان پروژه</h2>
        {(["challenge", "solution", "outcome"] as const).map((name) => (
          <FormRow key={name} label={{ challenge: "چالش", solution: "راه‌حل", outcome: "نتیجه" }[name]} htmlFor={`pf-${name}`} error={errors[name]?.message}>
            <Textarea id={`pf-${name}`} rows={4} aria-invalid={Boolean(errors[name])} {...register(name)} />
          </FormRow>
        ))}
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="pf-rel">
        <h2 id="pf-rel" className="text-lg font-semibold">خدمت‌ها و فناوری‌ها</h2>
        <Controller control={control} name="serviceIds" render={({ field }) => (
          <CheckGroup legend="خدمت‌های انجام‌شده (برای انتشار دست‌کم یکی)" choices={services} value={field.value} onChange={field.onChange} error={errors.serviceIds?.message} />
        )} />
        <Controller control={control} name="techTagIds" render={({ field }) => (
          <CheckGroup legend="فناوری‌ها" choices={techTags} value={field.value} onChange={field.onChange} error={errors.techTagIds?.message} />
        )} />
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="pf-media">
        <h2 id="pf-media" className="text-lg font-semibold">تصاویر</h2>
        <Controller control={control} name="coverMediaId" render={({ field }) => (
          <MediaPicker name="pf-cover" label="کاور (فقط تصویر، با متن جایگزین)" options={images} value={field.value} onChange={field.onChange} noneLabel="بدون کاور" error={errors.coverMediaId?.message} />
        )} />
        <div className="flex flex-col gap-3">
          <MediaPicker
            name="pf-gallery-add"
            label={`افزودن به گالری (${galleryItems.length.toLocaleString("fa-IR")} از ${MAX_GALLERY.toLocaleString("fa-IR")})`}
            options={galleryChoices.filter((o) => !galleryItems.some((g) => g.mediaId === o.id))}
            value=""
            onChange={(mediaId) => mediaId && gallery.fields.length < MAX_GALLERY && gallery.append({ mediaId, caption: "" })}
          />
          {errors.gallery?.root?.message ?? errors.gallery?.message ? <p role="alert" className="text-sm text-destructive">{errors.gallery?.root?.message ?? errors.gallery?.message}</p> : null}
          <ol className="flex flex-col gap-2">
            {gallery.fields.map((item, index) => {
              const option = byId.get(item.mediaId);
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                  <span className="w-24 truncate text-xs text-muted-foreground">{option ? (option.kind === "video" ? "ویدیو" : option.alt || "بدون alt") : "فایل حذف‌شده"}</span>
                  <Input aria-label={`شرح تصویر ${(index + 1).toLocaleString("fa-IR")}`} className="min-w-40 flex-1" maxLength={200} {...register(`gallery.${index}.caption`)} />
                  <Button type="button" size="sm" variant="outline" disabled={index === 0} aria-label="بالاتر" onClick={() => gallery.move(index, index - 1)}>↑</Button>
                  <Button type="button" size="sm" variant="outline" disabled={index === gallery.fields.length - 1} aria-label="پایین‌تر" onClick={() => gallery.move(index, index + 1)}>↓</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => gallery.remove(index)}>حذف</Button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="pf-metrics">
        <h2 id="pf-metrics" className="text-lg font-semibold">شاخص‌های نتیجه</h2>
        <p className="text-sm text-muted-foreground">فقط عددهای واقعی؛ در بخش «نتایج» سایت نمایش داده می‌شود. مثال: «زمان بارگذاری» و «۱٫۲ ثانیه».</p>
        {metrics.fields.map((item, index) => (
          <div key={item.id} className="flex flex-wrap items-start gap-2">
            <div className="min-w-40 flex-1">
              <Input aria-label={`عنوان شاخص ${(index + 1).toLocaleString("fa-IR")}`} aria-invalid={Boolean(errors.metrics?.[index]?.label)} maxLength={80} {...register(`metrics.${index}.label`)} />
              {errors.metrics?.[index]?.label ? <p role="alert" className="mt-1 text-sm text-destructive">{errors.metrics[index]?.label?.message}</p> : null}
            </div>
            <div className="w-40">
              <Input aria-label={`مقدار شاخص ${(index + 1).toLocaleString("fa-IR")}`} aria-invalid={Boolean(errors.metrics?.[index]?.value)} maxLength={40} {...register(`metrics.${index}.value`)} />
              {errors.metrics?.[index]?.value ? <p role="alert" className="mt-1 text-sm text-destructive">{errors.metrics[index]?.value?.message}</p> : null}
            </div>
            <Button type="button" size="sm" variant="outline" disabled={index === 0} aria-label="بالاتر" onClick={() => metrics.move(index, index - 1)}>↑</Button>
            <Button type="button" size="sm" variant="outline" disabled={index === metrics.fields.length - 1} aria-label="پایین‌تر" onClick={() => metrics.move(index, index + 1)}>↓</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => metrics.remove(index)}>حذف</Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="outline" size="sm" disabled={metrics.fields.length >= MAX_METRICS} onClick={() => metrics.append({ label: "", value: "" })}>
            افزودن شاخص
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="pf-seo">
        <h2 id="pf-seo" className="text-lg font-semibold">سئو</h2>
        <FormRow label="عنوان سئو" htmlFor="pf-seo-title" error={errors.seoTitle?.message} hint="خالی = همان عنوان پروژه." counter={{ value: seoTitle.length, max: 70 }}>
          <Input id="pf-seo-title" aria-invalid={Boolean(errors.seoTitle)} {...register("seoTitle")} />
        </FormRow>
        <FormRow label="توضیح سئو" htmlFor="pf-seo-desc" error={errors.seoDescription?.message} hint="خالی = همان خلاصه." counter={{ value: seoDescription.length, max: 160 }}>
          <Textarea id="pf-seo-desc" rows={2} aria-invalid={Boolean(errors.seoDescription)} {...register("seoDescription")} />
        </FormRow>
      </section>

      <OutcomeMessage outcome={outcome} />
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{id ? "ذخیره‌ی تغییرات" : "ایجاد پروژه"}</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/projects")}>بازگشت</Button>
      </div>
      <ConflictDialog open={conflict} onClose={() => setConflict(false)} onReload={() => router.refresh()} />
    </form>
  );
}
