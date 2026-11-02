import { useId, type HTMLAttributes, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";

export type FormFieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  multiline?: boolean;
  optional?: boolean;
  id?: string;
  name?: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  dir?: "rtl" | "ltr" | "auto";
};

/** A labelled text input or textarea with a hint and an error line. The label is always visible, never placeholder-only. */
export function FormField({ label, hint, error, multiline = false, optional = false, id, ...rest }: FormFieldProps) {
  const auto = useId();
  const fid = id ?? `lm-f${auto.replace(/:/g, "")}`;
  const hintId = hint ? `${fid}-hint` : undefined;
  const errId = error ? `${fid}-err` : undefined;
  const common = { id: fid, className: "lm-field__control", "aria-invalid": error ? true : undefined, "aria-describedby": [errId, hintId].filter(Boolean).join(" ") || undefined } as const;
  return (
    <div className={`lm-field${error ? " is-invalid" : ""}`}>
      <label className="lm-field__label" htmlFor={fid}>
        {label}
        {optional ? <span className="lm-field__optional"> (اختیاری)</span> : null}
      </label>
      {multiline ? <textarea {...common} {...rest} /> : <input {...common} {...rest} />}
      {hint ? (
        <p className="lm-field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="lm-field__error" id={errId}>
          <CircleAlert size="1em" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
