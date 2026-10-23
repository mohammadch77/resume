"use client";

import { useState, useSyncExternalStore } from "react";
import { Chip, Modal, ProjectCard } from "@/components/ds";
import { StripProgress } from "./strip-progress";

export type WorkCard = {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  industry: string | null;
  /** The real cover (ResponsivePicture) or null: then the design system's CoverArt is drawn. */
  cover: React.ReactNode;
  modalCover: React.ReactNode;
  challenge: string;
  solution: string;
  outcome: string;
  extra: React.ReactNode;
};

type Props = { cards: WorkCard[]; filters: string[]; ctaLabel: string };

const ALL = "همه";
const DEEP_LINK = /^#work\/(.+)$/;
const ARTS = [1, 2, 3, 4] as const;

const subscribeHash = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => window.removeEventListener("hashchange", notify);
};
const noopSubscribe = () => () => {};

/**
 * The Selected Work strip: filter chips, the cards and the case-study modal.
 * - Without JavaScript the cards are plain links to /work/<slug> and the filter row stays hidden (it needs JS).
 * - The modal's open state IS the URL hash (#work/<slug>): deep links work, Back closes it, and there is no state to sync.
 */
export function WorkExplorer({ cards, filters, ctaLabel }: Props) {
  const [filter, setFilter] = useState(ALL);
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const shown = filter === ALL ? cards : cards.filter((c) => c.industry === filter);
  const openSlug = DEEP_LINK.exec(hash)?.[1] ?? null;
  const openCard = openSlug ? (cards.find((c) => c.slug === decodeURIComponent(openSlug)) ?? null) : null;

  const open = (slug: string) => {
    history.pushState(null, "", `#work/${slug}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };
  const close = () => {
    history.replaceState(history.state, "", "#work");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  return (
    <>
      <div className="lk-wrap lk-strip-head">
        <h2 className="lk-h2">نمونه‌کارهای منتخب</h2>
        {filters.length > 1 && (
          <div className="gw-chip-row" role="group" aria-label="فیلتر نمونه‌کارها" hidden={!hydrated}>
            {[ALL, ...filters].map((f) => (
              <Chip key={f} variant="filter" selected={filter === f} onClick={() => setFilter(f)}>
                {f}
              </Chip>
            ))}
          </div>
        )}
      </div>
      <div className="lk-strip" id="work-strip" key={`strip-${filter}`} role="region" aria-label="نمونه‌کارها" tabIndex={0}>
        {shown.map((c, i) => (
          <ProjectCard
            key={c.slug}
            art={ARTS[i % ARTS.length]}
            sample={false}
            tags={c.tags}
            title={c.title}
            summary={c.summary}
            href={`/work/${c.slug}`}
            ctaLabel="مشاهده‌ی جزئیات پروژه"
            cover={c.cover}
            onOpen={(e) => {
              e.preventDefault();
              open(c.slug);
            }}
          />
        ))}
      </div>
      <StripProgress key={`progress-${filter}`} stripId="work-strip" count={shown.length} />
      {openCard && (
        <Modal
          open
          onClose={close}
          title={openCard.title}
          tags={openCard.tags}
          art={ARTS[cards.indexOf(openCard) % ARTS.length]}
          challenge={openCard.challenge || "—"}
          solution={openCard.solution || "—"}
          outcome={openCard.outcome || "—"}
          primaryLabel={ctaLabel}
          primaryHref="#contact"
          onPrimary={close}
          cover={openCard.modalCover}
          extra={openCard.extra}
        />
      )}
    </>
  );
}
