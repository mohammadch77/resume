/**
 * Grin Web button. Label states the outcome («درخواست مشاوره رایگان»), never «ارسال» or «کلیک کنید».
 * @startingPoint section="Actions" subtitle="Primary, secondary, quiet, danger" viewport="700x320"
 */
export interface ButtonProps {
  /** primary = lapis fill (one per view region); secondary = outline; quiet = text-only lapis; danger = destructive (admin). */
  variant?: "primary" | "secondary" | "quiet" | "danger";
  /** md = 48px tall (default, touch-safe); sm = 36px, desktop/admin density only. */
  size?: "md" | "sm";
  /** Renders an <a> when set. */
  href?: string;
  /** Lucide icon name before the label (inline-start). */
  iconStart?: string;
  /** Lucide icon name after the label (inline-end). In RTL use "arrow-left" for forward. */
  iconEnd?: string;
  /** Icon-only square button; requires `label`. */
  iconOnly?: string;
  /** Accessible name for icon-only buttons. */
  label?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  onClick?: (e: any) => void;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
