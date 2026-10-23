"use client";

import type { PickerOption } from "@/lib/media/picker";
import { cn } from "@/lib/utils";

type Props = {
  /** Used to build ids; must be unique on the page. */
  name: string;
  label: string;
  options: PickerOption[];
  value: string;
  onChange: (id: string) => void;
  /** Text of the "nothing selected" choice, e.g. "بدون لوگو". Omit for an "add" picker that has no empty state. */
  noneLabel?: string;
  error?: string;
};

/**
 * A radio group of thumbnails. Keyboard: arrow keys move between choices (native radio behaviour).
 * Images without alt text are marked, because a project cover without alt cannot be published.
 */
export function MediaPicker({ name, label, options, value, onChange, noneLabel, error }: Props) {
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-4" role="presentation">
        {noneLabel !== undefined ? (
          <label className={cn("flex aspect-4/3 cursor-pointer items-center justify-center rounded-md border p-2 text-center text-xs", value === "" && "ring-2 ring-ring")}>
            <input type="radio" name={name} className="sr-only" checked={value === ""} onChange={() => onChange("")} />
            {noneLabel}
          </label>
        ) : null}
        {options.map((o) => (
          <label key={o.id} className={cn("relative block aspect-4/3 cursor-pointer overflow-hidden rounded-md border focus-within:outline-2 focus-within:outline-offset-2", value === o.id && "ring-2 ring-ring")}>
            <input type="radio" name={name} className="sr-only" checked={value === o.id} onChange={() => onChange(o.id)} aria-label={o.alt || "تصویر بدون متن جایگزین"} />
            {o.src ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of a self-hosted upload; the alt text is the asset's own
              <img src={o.src} alt="" width={160} height={120} loading="lazy" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-xs">{o.kind === "video" ? "ویدیو" : "—"}</span>
            )}
            {o.alt ? null : <span className="absolute inset-x-0 bottom-0 bg-background/90 px-1 text-caption text-destructive">بدون alt</span>}
          </label>
        ))}
      </div>
      {error ? (
        <p id={`${name}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
