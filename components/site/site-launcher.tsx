"use client";

import type { ContactTexts } from "@/lib/site/contact-texts";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { lockScroll } from "@/lib/motion/scroll-lock";
import { CONTACT_HREF, MENU_HASH } from "@/lib/site/links";

type ContactView = ComponentType<{ ctaLabel: string; contact: ContactTexts; onClose: () => void }>;
type CaseView = ComponentType<{ slug: string; title: string; ctaLabel: string; onClose: () => void }>;
type View = { kind: "contact"; C: ContactView } | { kind: "case"; C: CaseView; slug: string; title: string };

const CASE_HASH = /^#work\/(.+)$/;

/**
 * Everything on the page that opens when you click, as one delegated click handler (so the first load carries only this and not the
 * dialogs): the contact form (every link to /contact), the case-study dialog (a project card, or a #work/<slug> link), and the
 * full-screen menu (the Menu button). All three are real links first: without JavaScript, before this runs, or with a modified click
 * (new tab) the browser simply navigates, to /contact, to /work/<slug>, or to the menu's :target. Each overlay's code is a separate chunk,
 * fetched by the first click. Renders the open dialog.
 */
export function SiteLauncher({ ctaLabel, contact }: { ctaLabel: string; contact: ContactTexts }) {
  const [view, setView] = useState<View | null>(null);
  const closeRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    let active: "contact" | "case" | null = null;
    let unlock: (() => void) | undefined;
    let openSlug: string | null = null;

    const finish = () => {
      unlock?.();
      unlock = undefined;
      active = null;
      openSlug = null;
      setView(null);
    };
    closeRef.current = () => {
      if (active === "case") {
        // the hash is the state: leaving #work/<slug> closes the dialog (Back does the same)
        history.replaceState(history.state, "", "#work");
        syncCase();
      } else finish();
    };

    const openContact = () => {
      if (active) return;
      active = "contact";
      unlock = lockScroll();
      void import("./contact-dialog").then((m) => (active === "contact" ? setView({ kind: "contact", C: m.default }) : undefined));
    };

    function syncCase() {
      const slug = CASE_HASH.exec(window.location.hash)?.[1];
      if (!slug) {
        if (active === "case") finish();
        return;
      }
      const decoded = decodeURIComponent(slug);
      if (active === "case" && openSlug === decoded) return;
      if (active === "contact") return;
      const link = [...document.querySelectorAll<HTMLElement>("[data-case]")].find((a) => a.dataset.case === decoded);
      if (!link) return; // not a project of this page: nothing to open
      if (active !== "case") unlock = lockScroll();
      active = "case";
      openSlug = decoded;
      const title = link.dataset.caseTitle ?? decoded;
      void import("./case-dialog").then((m) => (active === "case" && openSlug === decoded ? setView({ kind: "case", C: m.default, slug: decoded, title }) : undefined));
    }

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      const menu = target.closest<HTMLAnchorElement>(`a[href="${MENU_HASH}"]`);
      if (menu) {
        e.preventDefault();
        // The smooth-scroll engine (Lenis, anchors: true) listens for clicks on the window and would scroll to "#lm-menu", a fixed element at the
        // top: the page would jump to the top while the menu opens. This listener runs in the capture phase, so it can keep the click from it.
        e.stopPropagation();
        void import("@/lib/site/menu").then((m) => m.openMenu(menu));
        return;
      }
      const card = target.closest<HTMLAnchorElement>("a[data-case]");
      if (card && card.dataset.case) {
        e.preventDefault();
        history.pushState(null, "", `#work/${encodeURIComponent(card.dataset.case)}`);
        syncCase();
        return;
      }
      if (target.closest(`a[href="${CONTACT_HREF}"]`)) {
        e.preventDefault();
        // from a button inside the case-study dialog: let that one close first so the two never overlap
        if (active === "case") {
          closeRef.current?.();
          window.setTimeout(openContact, 60);
        } else openContact();
      }
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", syncCase);
    if (window.location.hash === MENU_HASH) void import("@/lib/site/menu").then((m) => m.openMenu(document.querySelector<HTMLElement>(".lm-menu-button")));
    else syncCase();
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", syncCase);
      unlock?.();
    };
  }, []);

  if (!view) return null;
  const onClose = () => closeRef.current?.();
  return view.kind === "contact" ? <view.C ctaLabel={ctaLabel} contact={contact} onClose={onClose} /> : <view.C slug={view.slug} title={view.title} ctaLabel={ctaLabel} onClose={onClose} />;
}
