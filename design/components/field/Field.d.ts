/**
 * Labelled text input or textarea with hint and invalid state. Label is always visible — never placeholder-only.
 * @startingPoint section="Forms" subtitle="Label, hint, invalid, disabled, textarea" viewport="700x420"
 */
export interface FieldProps {
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
  inputMode?: string;
  autoComplete?: string;
  dir?: "rtl" | "ltr" | "auto";
  onChange?: (e: any) => void;
  className?: string;
}
export declare function Field(props: FieldProps): JSX.Element;
