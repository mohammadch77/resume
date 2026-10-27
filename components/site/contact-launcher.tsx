"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { lockScroll } from "@/lib/motion/scroll-lock";
import { CONTACT_HREF } from "@/lib/site/links";

type DialogComponent = ComponentType<{ ctaLabel: string; onClose: () => void }>;

/**
 * Turns every link to /contact (the Navbar and hero buttons, the services band, the footer link) into "open the contact
 * dialog". The links stay real links to the /contact page, so without JavaScript, with a modified click (new tab) or before
 * this loads, they simply navigate. The form, its server action and the dialog are a separate chunk, fetched by the first
 * click (a plain dynamic import: next/dynamic would add its loader to the first load). Renders the dialog while it is open.
 */
export function ContactLauncher({ ctaLabel }: { ctaLabel: string }) {
  const [Form, setForm] = useState<DialogComponent | null>(null);
  const close = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    const open = () => {
      if (close.current) return;
      const unlock = lockScroll();
      close.current = () => {
        unlock();
        close.current = undefined;
        setForm(null);
      };
      void import("./contact-dialog").then((m) => (close.current ? setForm(() => m.default) : undefined));
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest(`a[href="${CONTACT_HREF}"]`) : null;
      if (!a) return;
      e.preventDefault();
      // From a button inside another dialog (the case study's): let that one close first so the two never overlap.
      if (a.closest('[role="dialog"]')) window.setTimeout(open, 60);
      else open();
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      close.current?.();
    };
  }, []);

  return Form ? <Form ctaLabel={ctaLabel} onClose={() => close.current?.()} /> : null;
}
