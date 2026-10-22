"use client";

import { useState, useTransition } from "react";
import { deleteCategoryAction, saveCategoryAction } from "@/app/(admin)/admin/(panel)/categories/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FormRow } from "@/components/admin/form/form-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaxonomyKind, TaxonomyRow } from "@/lib/admin/taxonomy";
import type { Outcome } from "@/lib/admin/outcome";

type Errors = { name?: string; slug?: string; form?: string };

function toErrors(r: Awaited<ReturnType<typeof saveCategoryAction>>): Errors | null {
  if (!r.ok) return { name: r.fieldErrors?.name?.[0], slug: r.fieldErrors?.slug?.[0], form: r.fieldErrors ? undefined : r.message };
  const o: Outcome<null> = r.data;
  if (o.kind === "ok") return null;
  if (o.kind === "failed") return o.field === "slug" ? { slug: o.message } : { form: o.message };
  return { form: "تغییر انجام نشد. صفحه را دوباره بارگذاری کنید." };
}

/** Add form + list with inline edit and delete for one kind (industries or technologies). */
export function TaxonomyManager({ kind, title, rows }: { kind: TaxonomyKind; title: string; rows: TaxonomyRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [toDelete, setToDelete] = useState<TaxonomyRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const idPrefix = `${kind}-`;

  const reset = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setErrors({});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const failure = toErrors(await saveCategoryAction({ kind, id: editing ?? undefined, name, slug }));
      if (failure) setErrors(failure);
      else reset();
    });
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    start(async () => {
      const r = await deleteCategoryAction({ kind, id: toDelete.id });
      const message = !r.ok ? r.message : r.data.kind === "failed" ? r.data.message : null;
      setDeleteError(message);
      if (!message) setToDelete(null);
    });
  };

  return (
    <section aria-labelledby={`${idPrefix}title`} className="flex flex-col gap-4">
      <h2 id={`${idPrefix}title`} className="text-lg font-semibold">
        {title}
      </h2>
      <form onSubmit={submit} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
        <FormRow label="نام" htmlFor={`${idPrefix}name`} error={errors.name} required>
          <Input id={`${idPrefix}name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-invalid={Boolean(errors.name)} />
        </FormRow>
        <FormRow label="نشانی (slug)" htmlFor={`${idPrefix}slug`} error={errors.slug} hint="لاتین، مثال: online-store" required>
          <Input id={`${idPrefix}slug`} dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={80} aria-invalid={Boolean(errors.slug)} />
        </FormRow>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {editing ? "ذخیره‌ی تغییر" : "افزودن"}
          </Button>
          {editing ? (
            <Button type="button" variant="outline" onClick={reset}>
              انصراف
            </Button>
          ) : null}
        </div>
        {errors.form ? (
          <p role="alert" className="text-sm text-destructive sm:col-span-3">
            {errors.form}
          </p>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">هنوز موردی ثبت نشده است.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-testid="category-row">
              <span className="font-medium">{row.name}</span>
              <span dir="ltr" className="text-xs text-muted-foreground">
                {row.slug}
              </span>
              <span className="text-xs text-muted-foreground">
                {row.usage > 0 ? `در ${row.usage.toLocaleString("fa-IR")} مورد استفاده شده` : "استفاده نشده"}
              </span>
              <span className="ms-auto flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(row.id);
                    setName(row.name);
                    setSlug(row.slug);
                    setErrors({});
                  }}
                >
                  ویرایش
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDeleteError(null);
                    setToDelete(row);
                  }}
                >
                  حذف
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`حذف «${toDelete?.name ?? ""}»؟`}
        description={deleteError ?? "این مورد از فهرست برداشته می‌شود."}
        confirmLabel="حذف"
        destructive
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
