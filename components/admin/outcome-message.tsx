import type { Outcome } from "@/lib/admin/outcome";

/** Shows the result of an action: blocked reasons as a list, failures as an alert. `ok` renders `okText` if given. */
export function OutcomeMessage({ outcome, okText }: { outcome: Outcome<unknown> | null; okText?: string }) {
  if (!outcome) return null;
  if (outcome.kind === "ok") return okText ? <p role="status" className="text-sm text-muted-foreground">{okText}</p> : null;
  if (outcome.kind === "blocked") {
    return (
      <div role="alert" className="rounded-md border border-destructive p-3 text-sm">
        <p className="font-semibold text-destructive">انجام نشد. شرط‌های انتشار برقرار نیست؛ موارد زیر را کامل کنید:</p>
        <ul className="mt-2 list-disc ps-5">
          {outcome.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (outcome.kind === "failed") {
    return (
      <p role="alert" className="text-sm text-destructive">
        {outcome.message}
      </p>
    );
  }
  return null; // conflict is handled by <ConflictDialog />
}
