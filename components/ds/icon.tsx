import {
  ArrowLeft,
  ArrowUpLeft,
  Calendar,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Code,
  CodeXml,
  Database,
  Gauge,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  Mail,
  MapPin,
  Menu,
  Palette,
  Phone,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Trash2,
  TriangleAlert,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";

/**
 * The icons the site and admin use, by Lucide's kebab-case name. An explicit map (instead of the CDN loader of the
 * design export) keeps the bundle tree-shaken and the runtime free of external requests. Add an icon here to use it.
 */
const ICONS = {
  "arrow-left": ArrowLeft,
  "arrow-up-left": ArrowUpLeft,
  calendar: Calendar,
  check: Check,
  "circle-alert": CircleAlert,
  "circle-check": CircleCheck,
  "circle-x": CircleX,
  code: Code,
  "code-xml": CodeXml,
  database: Database,
  gauge: Gauge,
  globe: Globe,
  "layout-dashboard": LayoutDashboard,
  "layout-grid": LayoutGrid,
  "life-buoy": LifeBuoy,
  mail: Mail,
  "map-pin": MapPin,
  menu: Menu,
  palette: Palette,
  phone: Phone,
  search: Search,
  "shield-check": ShieldCheck,
  "shopping-cart": ShoppingCart,
  smartphone: Smartphone,
  "trash-2": Trash2,
  "triangle-alert": TriangleAlert,
  workflow: Workflow,
  x: X,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export type IconProps = {
  /** Lucide icon name, kebab-case, e.g. "arrow-left", "circle-alert". */
  name: IconName;
  /** Pixel size; defaults to 20 (or the parent's --gw-icon-size). */
  size?: number;
  /** Mirror horizontally inside dir="rtl" (for icons whose meaning is not already directional). */
  mirror?: boolean;
  /** Accessible label. Omit for decorative icons (aria-hidden). */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
};

/** Lucide line icon at 1.5px stroke that inherits the text colour (`currentColor`). */
export function Icon({ name, size, mirror = false, label, className = "", style }: IconProps) {
  const Glyph = ICONS[name];
  return (
    <span
      className={["gw-icon", mirror && "gw-icon--mirror", className].filter(Boolean).join(" ")}
      style={{ ...(size ? ({ "--gw-icon-size": `${size}px` } as React.CSSProperties) : {}), ...style }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Glyph strokeWidth={1.5} aria-hidden="true" focusable="false" />
    </span>
  );
}
