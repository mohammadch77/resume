/** Printer's crop marks around a square-cornered cover — the brand's one signature device. Intentional addition (exposes the device used by ProjectCard and Modal). */
export interface CropFrameProps {
  /** Gutter between the ticks' frame edge and the cover, px (default 14). */
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function CropFrame(props: CropFrameProps): JSX.Element;
