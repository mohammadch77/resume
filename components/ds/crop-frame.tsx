export type CropFrameProps = {
  /** Gutter between the ticks' frame edge and the cover, px (default 14). */
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/** Printer's crop marks around a square-cornered cover: the brand's one signature device (project covers and hero frames only). */
export function CropFrame({ gap, className = "", style, children }: CropFrameProps) {
  return (
    <div className={["gw-crop-frame", className].filter(Boolean).join(" ")} style={{ ...(gap ? ({ "--gw-crop-gap": `${gap}px` } as React.CSSProperties) : {}), ...style }}>
      <span className="gw-crop gw-crop--ts" aria-hidden="true" />
      <span className="gw-crop gw-crop--te" aria-hidden="true" />
      <span className="gw-crop gw-crop--bs" aria-hidden="true" />
      <span className="gw-crop gw-crop--be" aria-hidden="true" />
      {children}
    </div>
  );
}
