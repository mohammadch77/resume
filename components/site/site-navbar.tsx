"use client";

import { useEffect, useState } from "react";
import { Navbar, type NavLink } from "@/components/ds";
import { CONTACT_HREF } from "@/lib/site/links";
import { SCROLL_SPY_MARGIN } from "@/lib/site/scroll-spy";

type Props = { brand: string; links: NavLink[]; ctaLabel: string };

/** The design system's navbar plus scroll-spy: `current` follows the section in view (IntersectionObserver). */
export function SiteNavbar({ brand, links, ctaLabel }: Props) {
  const [current, setCurrent] = useState<string | undefined>(undefined);

  useEffect(() => {
    const targets = links.map((l) => document.getElementById(l.href.slice(1))).filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0 || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCurrent(`#${visible.target.id}`);
      },
      { rootMargin: SCROLL_SPY_MARGIN },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [links]);

  return <Navbar brand={brand} links={links} current={current} ctaLabel={ctaLabel} ctaHref={CONTACT_HREF} />;
}
