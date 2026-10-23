import { useId } from "react";
import { Icon } from "./icon";

export type FieldProps = {
  /** Visible label (required). */
  label: React.ReactNode;
  /** Helper line under the control (caption, ink-subtle). */
  hint?: React.ReactNode;
  /** Error message; sets aria-invalid and shows a circle-alert icon + text in danger. */
  error?: React.ReactNode;
  /** Render a textarea (min 144px). */
  multiline?: boolean;
  /** Appends «(اختیاری)» to the label. */
  optional?: boolean;
  id?: string;
  name?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  dir?: "rtl" | "ltr" | "auto";
  onChange?: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  className?: string;
  /** Applied to the control itself (the design card sets a min height on the textarea). */
  style?: React.CSSProperties;
};

/** Labelled text input or textarea with hint and invalid state. The label is always visible, never placeholder-only. */
export function Field({ label, hint, error, multiline = false, optional = false, id, disabled, className = "", ...rest }: FieldProps) {
  const auto = useId();
  const fid = id ?? `gw-f${auto.replace(/:/g, "")}`;
  const hintId = hint ? `${fid}-hint` : undefined;
  const errId = error ? `${fid}-err` : undefined;
  const common = {
    id: fid,
    className: "gw-field__control",
    disabled,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [errId, hintId].filter(Boolean).join(" ") || undefined,
  } as const;
  return (
    <div className={["gw-field", error && "is-invalid", disabled && "is-disabled", className].filter(Boolean).join(" ")}>
      <label className="gw-field__label" htmlFor={fid}>
        {label}
        {optional && <span className="gw-field__optional"> (اختیاری)</span>}
      </label>
      {multiline ? <textarea {...common} {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} /> : <input {...common} {...(rest as React.InputHTMLAttributes<HTMLInputElement>)} />}
      {hint && (
        <p className="gw-field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="gw-field__error" id={errId}>
          <Icon name="circle-alert" />
          {error}
        </p>
      )}
    </div>
  );
}
