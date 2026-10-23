import { Button } from "./button";
import { Chip } from "./chip";
import { CoverArt } from "./cover-art";
import { CropFrame } from "./crop-frame";

export type ProjectCardProps = {
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
  onOpen?: React.MouseEventHandler<HTMLElement>;
  href?: string;
  headingLevel?: 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Extension of the export (additive): the cover as a node, e.g. the site's <ResponsivePicture>. When set it replaces
   * CoverArt, which stays the fallback for a project without an image.
   */
  cover?: React.ReactNode;
};

/** Portfolio card: 4:3 square cover framed by four crop-mark ticks, tags, title, summary, quiet CTA that opens the case-study modal. */
export function ProjectCard({ title, summary, tags = [], art = 1, image, alt, sample = true, ctaLabel = "مشاهده‌ی جزئیات پروژه", onOpen, href, headingLevel = 3, className = "", style, cover }: ProjectCardProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <article className={["gw-project", className].filter(Boolean).join(" ")} style={style}>
      <CropFrame>{cover ? <div className="gw-cover">{cover}</div> : <CoverArt art={art} image={image} alt={alt} sample={sample} />}</CropFrame>
      <div className="gw-project__body">
        {tags.length > 0 && (
          <div className="gw-chip-row">
            {tags.slice(0, 4).map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        )}
        <Heading className="gw-project__title">{title}</Heading>
        {summary && <p className="gw-project__summary">{summary}</p>}
        <Button variant="quiet" className="gw-project__cta" iconEnd="arrow-left" href={href} onClick={onOpen}>
          {ctaLabel}
        </Button>
      </div>
    </article>
  );
}
