/** 4:3 square-cornered project cover: a real image, or one of four abstract placeholder compositions built only from colour tokens. */
export interface CoverArtProps {
  /** Placeholder composition 1–4 (1 is the only one using saffron). Ignored when `image` is set. */
  art?: 1 | 2 | 3 | 4;
  /** Real project screenshot URL. */
  image?: string;
  alt?: string;
  /** Show the «نمونه» badge (demo content). */
  sample?: boolean;
  sampleLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}
export declare function CoverArt(props: CoverArtProps): JSX.Element;
