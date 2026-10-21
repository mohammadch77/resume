import React from "react";
import { Button } from "../button/Button.jsx";
import { Chip } from "../chip/Chip.jsx";
import { CropFrame } from "./CropFrame.jsx";
import { CoverArt } from "./CoverArt.jsx";

export function ProjectCard({ title, summary, tags = [], art = 1, image, alt, sample = true, ctaLabel = "مشاهده‌ی جزئیات پروژه", onOpen, href, headingLevel = 3, className = "", style }) {
  const H = "h" + headingLevel;
  return (
    <article className={["gw-project", className].filter(Boolean).join(" ")} style={style}>
      <CropFrame><CoverArt art={art} image={image} alt={alt} sample={sample} /></CropFrame>
      <div className="gw-project__body">
        {tags.length > 0 && <div className="gw-chip-row">{tags.slice(0, 4).map((t) => <Chip key={t}>{t}</Chip>)}</div>}
        <H className="gw-project__title">{title}</H>
        {summary && <p className="gw-project__summary">{summary}</p>}
        <Button variant="quiet" className="gw-project__cta" iconEnd="arrow-left" href={href} onClick={onOpen}>{ctaLabel}</Button>
      </div>
    </article>
  );
}
