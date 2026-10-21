/**
 * Portfolio card: 4:3 square cover framed by four crop-mark ticks, tags, title, summary, quiet CTA that opens the case-study modal.
 * @startingPoint section="Content" subtitle="Crop-marked project cover + meta" viewport="700x620"
 */
export interface ProjectCardProps {
  title: string;
  /** One sentence, ≤ 2 lines. */
  summary?: string;
  /** Up to 4 topic tags. */
  tags?: string[];
  /** Placeholder composition 1–4 when no image. */
  art?: 1 | 2 | 3 | 4;
  image?: string;
  alt?: string;
  /** Show «نمونه» on the cover (default true until real data arrives). */
  sample?: boolean;
  ctaLabel?: string;
  onOpen?: (e: any) => void;
  href?: string;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
}
export declare function ProjectCard(props: ProjectCardProps): JSX.Element;
