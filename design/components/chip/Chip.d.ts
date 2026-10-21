/**
 * Pill-shaped label. The only element allowed radius-pill.
 * @startingPoint section="Content" subtitle="Tag, outline, filter, status" viewport="700x260"
 */
export interface ChipProps {
  /** tag = lapis-tint topic; outline = tech/neutral; filter = toggle button (aria-pressed); success/warning/danger = status with icon. */
  variant?: "tag" | "outline" | "filter" | "success" | "warning" | "danger";
  /** Filter chips only: pressed state (ink fill + check icon). */
  selected?: boolean;
  onClick?: (e: any) => void;
  /** Override the default status icon (Lucide name). */
  icon?: string;
  className?: string;
  children?: React.ReactNode;
}
export declare function Chip(props: ChipProps): JSX.Element;
