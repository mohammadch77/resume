"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { saveHomeAction } from "@/app/(admin)/admin/(panel)/home/actions";
import { ConflictDialog } from "@/components/admin/conflict-dialog";
import { FormRow } from "@/components/admin/form/form-row";
import { useUnsavedWarning } from "@/components/admin/form/use-unsaved-warning";
import { CardsManager, StatsManager } from "@/components/admin/home-lists";
import { MediaPicker } from "@/components/admin/media-picker";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CardRow, StatRow } from "@/lib/admin/home";
import type { Outcome } from "@/lib/admin/outcome";
import type { HomeTexts } from "@/lib/content/home-defaults";
import type { PickerOption } from "@/lib/media/picker";
import { HOME_TEXT_LABELS, HOME_TEXT_LIMITS, homeFormSchema, type HomeFormValues } from "@/lib/validation/home";

type Props = {
  version: number;
  initial: HomeFormValues;
  images: PickerOption[];
  cards: CardRow[];
  stats: StatRow[];
  partners: string[];
};

const LONG: Array<keyof HomeTexts> = ["heroDescription", "aboutLead", "aboutRest", "bandText", "footerTagline"];

/**
 * The whole landing page's editable content, in the order of the page: hero (texts, the two pictures, rating), carousel cards, status bar,
 * about, stats, section headings, band, footer. The texts, pictures, rating and status bar are one row with one version (one save, one
 * conflict dialog); the cards and the stats are lists whose rows change one by one (home-list-manager.tsx).
 */
export function HomeEditor({ version, initial, images, cards, stats, partners }: Props) {
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [liveVersion, setLiveVersion] = useState(version);
  const form = useForm<HomeFormValues>({ resolver: zodResolver(homeFormSchema), defaultValues: initial });
  const { register, handleSubmit, control, setError, reset, formState } = form;
  const { errors, isDirty } = formState;
  const watched = useWatch({ control });
  useUnsavedWarning(isDirty && !pending);

  const submit = handleSubmit((values) =>
    start(async () => {
      setSaved(false);
      setOutcome(null);
      const r = await saveHomeAction({ ...values, version: liveVersion });
      if (!r.ok) {
        for (const [field, messages] of Object.entries(r.fieldErrors ?? {})) setError(field as keyof HomeFormValues, { message: messages[0] });
        setOutcome({ kind: "failed", message: r.message });
        return;
      }
      if (r.data.kind === "conflict") return setConflict(true);
      if (r.data.kind === "failed" && r.data.field) setError(r.data.field as keyof HomeFormValues, { message: r.data.message });
      setOutcome(r.data);
      if (r.data.kind === "ok") {
        setSaved(true);
        setLiveVersion(r.data.value.version); // the next save must carry the version this one produced
        reset(values);
      }
    }),
  );

  const text = (key: keyof HomeTexts, hint?: string) => {
    const id = `hm-${key}`;
    const current = String(watched[key] ?? "");
    return (
      <FormRow key={key} label={HOME_TEXT_LABELS[key]} htmlFor={id} error={errors[key]?.message} hint={hint} required counter={{ value: current.length, max: HOME_TEXT_LIMITS[key] }}>
        {LONG.includes(key) ? <Textarea id={id} rows={3} aria-invalid={Boolean(errors[key])} {...register(key)} /> : <Input id={id} aria-invalid={Boolean(errors[key])} {...register(key)} />}
      </FormRow>
    );
  };

  const optional = (key: "statusLeft" | "statusCenter" | "statusRight" | "heroRatingLabel", label: string, hint?: string) => (
    <FormRow label={label} htmlFor={`hm-${key}`} error={errors[key]?.message} hint={hint} counter={{ value: String(watched[key] ?? "").length, max: 60 }}>
      <Input id={`hm-${key}`} aria-invalid={Boolean(errors[key])} {...register(key)} />
    </FormRow>
  );

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <section className="flex flex-col gap-5" aria-labelledby="hm-hero">
        <h2 id="hm-hero" className="text-lg font-semibold">۱. هیرو</h2>
        {text("heroEyebrow")}
        <div className="grid gap-5 sm:grid-cols-3">
          {text("heroLine1")}
          {text("heroLine2")}
          {text("heroLine3")}
        </div>
        {text("heroDescription")}
        {text("heroSecondaryCtaLabel", "دکمه‌ی اول (درخواست مشاوره) از «تنظیمات» می‌آید و در هدر، هیرو و بنر یکی است.")}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormRow label="امتیاز (۱ تا ۵)" htmlFor="hm-heroRatingScore" error={errors.heroRatingScore?.message} hint="با متن امتیاز؛ هر دو خالی = بدون امتیاز.">
            <Input id="hm-heroRatingScore" dir="ltr" inputMode="numeric" aria-invalid={Boolean(errors.heroRatingScore)} {...register("heroRatingScore")} />
          </FormRow>
          {optional("heroRatingLabel", "متن امتیاز", "فقط ادعای واقعی؛ مثال: بر پایه‌ی نظر مشتریان.")}
        </div>
        <p className="text-sm text-muted-foreground">
          تصویر هیرو: دو تصویر PNG/WebP/AVIF با پس‌زمینه‌ی شفاف، دقیقاً هم‌اندازه و هر دو با متن جایگزین (alt). بدون تصویر، هیرو فقط تایپوگرافی است. تصویر را از <Link href="/admin/media" className="underline">رسانه</Link> بارگذاری کنید.
        </p>
        <div className="grid gap-5 lg:grid-cols-2">
          <Controller
            control={control}
            name="heroImageBaseId"
            render={({ field }) => <MediaPicker name="hm-img-base" label="تصویر پایه (طرح‌گونه)" options={images} value={field.value} onChange={field.onChange} noneLabel="بدون تصویر" error={errors.heroImageBaseId?.message} />}
          />
          <Controller
            control={control}
            name="heroImageHoverId"
            render={({ field }) => <MediaPicker name="hm-img-hover" label="تصویر دوم (با حرکت موس نمایان می‌شود)" options={images} value={field.value} onChange={field.onChange} noneLabel="بدون تصویر" error={errors.heroImageHoverId?.message} />}
          />
        </div>
        <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
          <p className="font-medium">مشتریان «مورد اعتماد» زیر هیرو</p>
          {partners.length > 0 ? <p data-testid="partners">{partners.join("، ")}</p> : <p className="text-muted-foreground">هنوز مشتری‌ای با «نمایش عمومی نام» نیست؛ این نوار نمایش داده نمی‌شود.</p>}
          <p className="text-muted-foreground">
            این فهرست خودکار از ماژول <Link href="/admin/clients" className="underline">مشتریان</Link> (گزینه‌ی «نمایش عمومی نام») می‌آید.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="hm-cards">
        <h2 id="hm-cards" className="text-lg font-semibold">۲. کارت‌های کروسل هیرو</h2>
        <CardsManager initial={cards} />
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="hm-status">
        <h2 id="hm-status" className="text-lg font-semibold">۳. نوار وضعیت زیر هیرو</h2>
        <p className="text-sm text-muted-foreground">سه متن کوتاه؛ هر کدام خالی باشد نمایش داده نمی‌شود. ادعای بی‌پشتوانه ننویسید.</p>
        <div className="grid gap-5 sm:grid-cols-3">
          {optional("statusLeft", "سمت راست")}
          {optional("statusCenter", "وسط")}
          {optional("statusRight", "سمت چپ")}
        </div>
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="hm-about">
        <h2 id="hm-about" className="text-lg font-semibold">۴. درباره</h2>
        {text("aboutEyebrow")}
        {text("aboutLead", "جمله‌ی اول، پررنگ.")}
        {text("aboutRest", "ادامه، کم‌رنگ‌تر.")}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="hm-stats">
        <h2 id="hm-stats" className="text-lg font-semibold">۵. آمار</h2>
        <StatsManager initial={stats} />
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="hm-headings">
        <h2 id="hm-headings" className="text-lg font-semibold">۶. عنوان بخش‌ها</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {text("workEyebrow", "همین متن در منوی بالا هم می‌آید.")}
          {text("workTitle")}
          {text("servicesEyebrow")}
          {text("servicesTitle")}
          {text("statsEyebrow")}
          {text("statsTitle")}
        </div>
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="hm-band">
        <h2 id="hm-band" className="text-lg font-semibold">۷. بنر بعد از خدمات</h2>
        {text("bandTitle")}
        {text("bandText", "دکمه‌ی بنر همان دکمه‌ی اصلی «تنظیمات» است.")}
      </section>

      <section className="flex flex-col gap-5" aria-labelledby="hm-footer">
        <h2 id="hm-footer" className="text-lg font-semibold">۸. فوتر</h2>
        {text("footerTagline")}
        {text("footerLegal", "سال و نام برند خودکار پیش از این متن می‌آیند.")}
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background py-3">
        <Button type="button" disabled={pending} onClick={submit}>
          ذخیره‌ی متن‌ها و تصویرها
        </Button>
        <OutcomeMessage outcome={outcome} okText="ذخیره شد و در صفحه‌ی اصلی اعمال می‌شود." />
        {saved && outcome === null ? <p role="status" className="text-sm text-muted-foreground">ذخیره شد.</p> : null}
        <p className="text-xs text-muted-foreground">کارت‌ها و آمار با هر دکمه‌شان جداگانه ذخیره می‌شوند.</p>
      </div>
      <ConflictDialog open={conflict} onClose={() => setConflict(false)} onReload={() => window.location.reload()} />
    </div>
  );
}
