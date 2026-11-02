"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useState, useTransition } from "react";
import { ConflictDialog } from "@/components/admin/conflict-dialog";
import { OutcomeMessage } from "@/components/admin/outcome-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Outcome } from "@/lib/admin/outcome";
import type { ActionResult } from "@/lib/auth/admin-action-core";
import { cn } from "@/lib/utils";

type Status = "draft" | "published" | "archived";
export type ListRow = { id: string; version: number; position: number; status: Status };
type Fields = Record<string, string>;
type Rows<R> = { rows: R[] };
type Call<R> = Promise<ActionResult<Outcome<Rows<R>>>>;

export type ListConfig<R extends ListRow> = {
  /** Ids and test ids: "card" | "stat" */
  kind: string;
  /** Text above the list, e.g. "کارت‌های هیرو" */
  title: string;
  hint: string;
  max: number;
  /** One input per field, in order. `dir: "ltr"` for numbers. */
  fields: Array<{ key: string; label: string; max: number; dir?: "ltr"; narrow?: boolean }>;
  toFields: (row: R) => Fields;
  summary: (row: R) => string;
  /** Persian messages per field from the same Zod schema the server uses; null when valid. */
  validate: (values: Fields) => Record<string, string> | null;
  add: (v: Fields) => Call<R>;
  update: (v: Record<string, string | number>) => Call<R>;
  setStatus: (v: { id: string; version: number; status: "draft" | "published" }) => Call<R>;
  remove: (v: { id: string; version: number }) => Call<R>;
  reorder: (v: { ids: string[] }) => Call<R>;
};

const STATUS_LABEL: Record<Status, string> = { draft: "پیش‌نویس", published: "منتشرشده", archived: "بایگانی" };
const blank = (config: { fields: Array<{ key: string }> }): Fields => Object.fromEntries(config.fields.map((f) => [f.key, ""]));

/**
 * An ordered list of at most `max` rows, each with its own version, status and fields (hero cards, stats). Every change is its own
 * action; the action answers with the fresh list, which replaces this one (so versions, positions and ids always match the database).
 * Reordering: drag the handle, or the up/down buttons (the keyboard path). An optimistic-lock conflict opens the same dialog as the forms.
 */
export function HomeListManager<R extends ListRow>({ config, initial }: { config: ListConfig<R>; initial: R[] }) {
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<Outcome<unknown> | null>(null);
  const [conflict, setConflict] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  /** Runs one action; returns true when it succeeded. */
  const run = (call: () => Call<R>, after?: () => void) =>
    start(async () => {
      setOutcome(null);
      const r = await call();
      if (!r.ok) return setOutcome({ kind: "failed", message: r.message });
      if (r.data.kind === "conflict") return setConflict(true);
      setOutcome(r.data.kind === "ok" ? null : r.data);
      if (r.data.kind === "ok") {
        setRows(r.data.value.rows);
        after?.();
      }
    });

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    const next = arrayMove(rows, from, to);
    setRows(next); // shows at once; the answer replaces it
    run(() => config.reorder({ ids: next.map((r) => r.id) }));
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    move(
      rows.findIndex((r) => r.id === e.active.id),
      rows.findIndex((r) => r.id === e.over!.id),
    );
  };

  return (
    <div className="flex flex-col gap-4" data-testid={`${config.kind}-manager`}>
      <p className="text-sm text-muted-foreground">
        {config.hint} ({rows.length.toLocaleString("fa-IR")} از {config.max.toLocaleString("fa-IR")})
      </p>
      {rows.length === 0 ? <p className="rounded-md border p-3 text-sm">هنوز موردی ثبت نشده است؛ این بخش در صفحه‌ی اصلی نمایش داده نمی‌شود.</p> : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <SortableRow key={row.id} id={row.id} kind={config.kind}>
                {(handle) => (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {handle}
                      <span className="min-w-40 flex-1 basis-40 text-sm font-medium" data-testid={`${config.kind}-summary`}>
                        {config.summary(row)}
                      </span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs", row.status === "published" && "border-foreground")} data-testid={`${config.kind}-status`}>
                        {STATUS_LABEL[row.status]}
                      </span>
                      <Button type="button" variant="outline" size="icon" aria-label="بالا" disabled={pending || i === 0} onClick={() => move(i, i - 1)}>
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" aria-label="پایین" disabled={pending || i === rows.length - 1} onClick={() => move(i, i + 1)}>
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setEditing(editing === row.id ? null : row.id)}>
                        {editing === row.id ? "بستن" : "ویرایش"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => config.setStatus({ id: row.id, version: row.version, status: row.status === "published" ? "draft" : "published" }))}
                      >
                        {row.status === "published" ? "لغو انتشار" : "انتشار"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run(() => config.remove({ id: row.id, version: row.version }))}>
                        حذف
                      </Button>
                    </div>
                    {editing === row.id ? (
                      <RowEditor
                        config={config}
                        initial={config.toFields(row)}
                        submitLabel="ذخیره‌ی تغییر"
                        pending={pending}
                        onSubmit={(v) => run(() => config.update({ ...v, id: row.id, version: row.version }), () => setEditing(null))}
                      />
                    ) : null}
                  </>
                )}
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {rows.length < config.max ? (
        <div className="rounded-lg border p-3">
          <p className="mb-2 text-sm font-medium">افزودن (به‌صورت پیش‌نویس)</p>
          <RowEditor key={rows.length} config={config} initial={blank(config)} submitLabel="افزودن" pending={pending} onSubmit={(v) => run(() => config.add(v))} />
        </div>
      ) : null}
      <OutcomeMessage outcome={outcome} />
      <ConflictDialog open={conflict} onClose={() => setConflict(false)} onReload={() => window.location.reload()} />
    </div>
  );
}

function SortableRow({ id, kind, children }: { id: string; kind: string; children: (handle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button type="button" className="cursor-grab touch-none rounded p-1 text-muted-foreground focus-visible:outline-2" aria-label="جابه‌جایی با کشیدن" {...attributes} {...listeners}>
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      data-testid={`${kind}-row`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex flex-col gap-3 rounded-lg border bg-background p-3", isDragging && "relative z-10 shadow-md")}
    >
      {children(handle)}
    </li>
  );
}

function RowEditor<R extends ListRow>({
  config,
  initial,
  submitLabel,
  pending,
  onSubmit,
}: {
  config: ListConfig<R>;
  initial: Fields;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: Fields) => void;
}) {
  const [values, setValues] = useState<Fields>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = () => {
    const found = config.validate(values);
    setErrors(found ?? {});
    if (!found) onSubmit(values);
  };
  return (
    <div className="flex flex-wrap items-start gap-3">
      {config.fields.map((f) => {
        const id = `${config.kind}-${f.key}-${initial[f.key] ?? ""}`.replace(/\s/g, "-");
        return (
          <div key={f.key} className={cn("flex flex-col gap-1", f.narrow ? "w-28" : "min-w-56 flex-1")}>
            <label htmlFor={id} className="text-xs text-muted-foreground">
              {f.label}
            </label>
            <Input
              id={id}
              data-field={f.key}
              dir={f.dir}
              value={values[f.key]}
              maxLength={f.max + 40}
              aria-invalid={Boolean(errors[f.key])}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            {errors[f.key] ? (
              <p role="alert" className="text-xs text-destructive">
                {errors[f.key]}
              </p>
            ) : null}
          </div>
        );
      })}
      <Button type="button" size="sm" className="mt-5" disabled={pending} onClick={submit}>
        {submitLabel}
      </Button>
    </div>
  );
}
