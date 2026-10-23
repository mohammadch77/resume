import { Button, Chip, Metric } from "@/components/ds";
import type { LandingProject } from "@/lib/content/landing";
import { formatNumber } from "@/lib/format";
import { IMAGE_SIZES } from "@/lib/media/sizes";
import { GalleryVideo } from "./gallery-video";
import { ResponsivePicture } from "./responsive-picture";

/**
 * What a case study shows besides the three columns: real results, the gallery and the live link. Shared by the
 * modal on the landing and the static /work/<slug> page. This is the ONLY place a <video> can appear: inside a
 * project's gallery, behind a poster, never loading before play (see GalleryVideo).
 */
export function CaseStudyExtra({ project }: { project: LandingProject }) {
  const hasAnything = project.metrics.length > 0 || project.gallery.length > 0 || project.liveUrl || project.serviceTitles.length > 0;
  if (!hasAnything) return null;
  return (
    <div className="lk-case">
      {project.serviceTitles.length > 0 && (
        <div className="lk-case__block">
          <h3 className="lk-case__h">خدمت‌های انجام‌شده</h3>
          <div className="gw-chip-row">
            {project.serviceTitles.map((t) => (
              <Chip key={t} variant="outline">
                {t}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {project.metrics.length > 0 && (
        <div className="lk-case__block">
          <h3 className="lk-case__h">نتیجه‌ها</h3>
          <div className="lk-case__metrics">
            {project.metrics.map((m) => (
              <Metric key={`${m.label}-${m.value}`} value={m.value} label={m.label} source={`پروژه‌ی ${project.title}`} />
            ))}
          </div>
        </div>
      )}
      {project.gallery.length > 0 && (
        <div className="lk-case__block">
          <h3 className="lk-case__h">تصویرها ({formatNumber(project.gallery.length)})</h3>
          <ul className="lk-case__gallery">
            {project.gallery.map((item) => (
              <li key={item.id}>
                <figure className="lk-case__figure">
                  {item.kind === "image" ? (
                    <ResponsivePicture asset={item.picture} sizes={IMAGE_SIZES.gallery} className="lk-cover-img" />
                  ) : (
                    <GalleryVideo video={item.video} poster={item.poster} className="lk-cover-img" />
                  )}
                  {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                </figure>
              </li>
            ))}
          </ul>
        </div>
      )}
      {project.liveUrl && (
        <div className="lk-case__block">
          <Button variant="secondary" href={project.liveUrl} iconEnd="arrow-left">
            مشاهده‌ی پروژه‌ی زنده
          </Button>
        </div>
      )}
    </div>
  );
}
