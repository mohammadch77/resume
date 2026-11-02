import type { LandingProject } from "@/lib/content/landing";
import { formatNumber } from "@/lib/format";
import { IMAGE_SIZES } from "@/lib/media/sizes";
import { GalleryVideo } from "./gallery-video";
import { ResponsivePicture } from "./responsive-picture";
import { PillButton, TagChip } from "./ui";

/**
 * What a case study shows: the challenge / solution / outcome columns, the services done, real results, the gallery and the live link.
 * It is the body of the static /work/<slug> page, and the same markup is what the dialog on the landing shows (it fetches that page and
 * takes this element, so there is one source). This is the ONLY place a <video> can appear: inside a project's gallery, behind a poster,
 * never loading before play (see GalleryVideo).
 */
export function CaseStudyBody({ project }: { project: LandingProject }) {
  const columns: Array<[string, string]> = [
    ["چالش", project.challenge],
    ["راه‌حل", project.solution],
    ["نتیجه", project.outcome],
  ];
  return (
    <div id="case-body" className="lm-case">
      <div className="lm-work__cols">
        {columns.map(([title, text]) => (
          <section key={title} className="lm-work__col">
            <h2 className="lm-case__h">{title}</h2>
            <p>{text || "—"}</p>
          </section>
        ))}
      </div>
      {project.serviceTitles.length > 0 ? (
        <section>
          <h3 className="lm-case__h">خدمت‌های انجام‌شده</h3>
          <div className="lm-case__chips">
            {project.serviceTitles.map((t) => (
              <TagChip key={t} tone="dark">
                {t}
              </TagChip>
            ))}
          </div>
        </section>
      ) : null}
      {project.metrics.length > 0 ? (
        <section>
          <h3 className="lm-case__h">نتیجه‌ها</h3>
          <dl className="lm-case__metrics">
            {project.metrics.map((m) => (
              <div key={`${m.label}-${m.value}`} className="lm-case__metric">
                <dt>{m.value}</dt>
                <dd>{m.label}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {project.gallery.length > 0 ? (
        <section>
          <h3 className="lm-case__h">تصویرها ({formatNumber(project.gallery.length)})</h3>
          <ul className="lm-case__gallery">
            {project.gallery.map((item) => (
              <li key={item.id}>
                <figure className="lm-case__figure">
                  {item.kind === "image" ? (
                    // a caption that repeats the alt text already names the image: read twice, it is noise for screen readers
                    <ResponsivePicture asset={item.picture} sizes={IMAGE_SIZES.gallery} alt={item.caption && item.caption === item.picture.altFa ? "" : undefined} placeholder={false} />
                  ) : (
                    <GalleryVideo video={item.video} poster={item.poster} />
                  )}
                  {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                </figure>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {project.liveUrl ? (
        <div>
          <PillButton href={project.liveUrl} variant="outline" arrow="up" rel="noopener noreferrer">
            مشاهده‌ی پروژه‌ی زنده
          </PillButton>
        </div>
      ) : null}
    </div>
  );
}
