import { Icon, type IconName } from "./icon";

export type ChipProps = {
  /** tag = lapis-tint topic; outline = tech/neutral; filter = toggle button (aria-pressed); success/warning/danger = status with icon. */
  variant?: "tag" | "outline" | "filter" | "success" | "warning" | "danger";
  /** Filter chips only: pressed state (ink fill + check icon). */
  selected?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Override the default status icon. */
  icon?: IconName;
  className?: string;
  children?: React.ReactNode;
} & React.AriaAttributes;

const STATUS_ICON: Partial<Record<NonNullable<ChipProps["variant"]>, IconName>> = { success: "circle-check", warning: "triangle-alert", danger: "circle-x" };

/** Pill-shaped label. The only element allowed radius-pill. */
export function Chip({ variant = "tag", selected = false, onClick, icon, className = "", children, ...rest }: ChipProps) {
  const cls = ["gw-chip", `gw-chip--${variant}`, className].filter(Boolean).join(" ");
  if (variant === "filter") {
    return (
      <button type="button" className={cls} aria-pressed={selected} onClick={onClick} {...rest}>
        {selected && <Icon name="check" />}
        {children}
      </button>
    );
  }
  const ic = icon ?? STATUS_ICON[variant];
  return (
    <span className={cls} {...rest}>
      {ic && <Icon name={ic} />}
      {children}
    </span>
  );
}
