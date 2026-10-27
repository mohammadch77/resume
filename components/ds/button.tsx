import { Icon, type IconName } from "./icon";

export type ButtonProps = {
  /** primary = lapis fill (one per view region); secondary = outline; quiet = text-only lapis; danger = destructive (admin); on-lapis = the primary action on a lapis ground (CtaBand). */
  variant?: "primary" | "secondary" | "quiet" | "danger" | "on-lapis";
  /** md = 48px tall (default, touch-safe); sm = 36px, desktop/admin density only. */
  size?: "md" | "sm";
  /** Renders an <a> when set. */
  href?: string;
  /** Lucide icon before the label (inline-start). */
  iconStart?: IconName;
  /** Lucide icon after the label (inline-end). In RTL use "arrow-left" for forward. */
  iconEnd?: IconName;
  /** Icon-only square button; requires `label`. */
  iconOnly?: IconName;
  /** Accessible name for icon-only buttons. */
  label?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  children?: React.ReactNode;
} & React.AriaAttributes;

/** Grin Web button. The label states the outcome («درخواست مشاوره رایگان»), never «ارسال» or «کلیک کنید». */
export function Button({ variant = "primary", size = "md", href, iconStart, iconEnd, iconOnly, label, disabled, type = "button", className = "", children, onClick, ...rest }: ButtonProps) {
  const cls = ["gw-btn", `gw-btn--${variant}`, size === "sm" && "gw-btn--sm", iconOnly && "gw-btn--icon", className].filter(Boolean).join(" ");
  const inner = (
    <>
      {iconStart && <Icon name={iconStart} />}
      {iconOnly ? <Icon name={iconOnly} /> : children}
      {iconEnd && <Icon name={iconEnd} />}
    </>
  );
  if (href) {
    return (
      <a className={cls} href={disabled ? undefined : href} aria-disabled={disabled || undefined} aria-label={iconOnly ? label : undefined} onClick={onClick} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled} aria-label={iconOnly ? label : undefined} onClick={onClick} {...rest}>
      {inner}
    </button>
  );
}
