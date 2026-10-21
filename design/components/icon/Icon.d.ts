/** Lucide line icon at 1.5px stroke. Intentional addition: Lucide is not bundled; this wrapper loads it from CDN. */
export interface IconProps {
  /** Lucide icon name, kebab-case, e.g. "arrow-left", "circle-alert". */
  name: string;
  /** Pixel size; defaults to 20 (or the parent's --gw-icon-size). */
  size?: number;
  /** Mirror horizontally inside dir="rtl" (for icons whose meaning is not already directional). */
  mirror?: boolean;
  /** Accessible label. Omit for decorative icons (aria-hidden). */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): JSX.Element;
