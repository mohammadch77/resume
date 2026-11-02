"use client";

import { useEffect, useState } from "react";
import { PillButton } from "./ui/pill-button";
import { PageDialog } from "./ui/client";

/**
 * The case study in a dialog over the landing. Its content is the case-study page itself: /work/<slug> is fetched (it is a cached static page,
 * so this is one small request) and the element with the case body is shown. There is one markup, one source of truth, and the dialog adds
 * no content code to the first load. If the fetch fails the visitor is simply sent to the page. Loaded only when a card is opened.
 */
export default function CaseDialog({ slug, title, ctaLabel, onClose }: { slug: string; title: string; ctaLabel: string; onClose: () => void }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/work/${encodeURIComponent(slug)}`, { headers: { accept: "text/html" } })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => {
        const body = new DOMParser().parseFromString(text, "text/html").getElementById("case-body");
        if (!body) throw new Error("no case body");
        if (!cancelled) setHtml(body.outerHTML);
      })
      .catch(() => {
        if (!cancelled) window.open(`/work/${encodeURIComponent(slug)}`, "_self");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <PageDialog title={title} eyebrow="نمونه‌کار" wide onClose={onClose}>
      {html === null ? <p className="lm-case__loading" role="status">در حال بارگذاری…</p> : <div dangerouslySetInnerHTML={{ __html: html }} />}
      <div className="lm-dialog__foot">
        <PillButton href="/contact" variant="accent" arrow="forward">
          {ctaLabel}
        </PillButton>
        <a className="lm-dialog__more" href={`/work/${encodeURIComponent(slug)}`}>
          صفحه‌ی کامل این نمونه‌کار
        </a>
      </div>
    </PageDialog>
  );
}
