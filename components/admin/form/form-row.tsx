import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  /** Live length counter, e.g. `{ value: 42, max: 70 }`. */
  counter?: { value: number; max: number };
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Label + control + hint + error (+ optional counter) with the ids wired up for assistive technology. */
export function FormRow({ label, htmlFor, error, hint, counter, required, className, children }: Props) {
  const over = counter ? counter.value > counter.max : false;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </Label>
        {counter ? (
          <span className={cn("text-xs", over ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
            {counter.value.toLocaleString("fa-IR")} / {counter.max.toLocaleString("fa-IR")}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
