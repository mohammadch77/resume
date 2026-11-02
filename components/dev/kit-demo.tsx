"use client";

import { useState } from "react";
import { NavMenu, PillButton } from "@/components/site/ui";
import { PageDialog } from "@/components/site/ui/client";

const ITEMS = [
  { label: "خانه", href: "#home" },
  { label: "نمونه‌کارها", href: "#work" },
  { label: "خدمات", href: "#services" },
  { label: "درباره", href: "#about" },
];

/** The two interactive pieces of the kit (menu, dialog), for the dev kit page and its tests. */
export function KitDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lm-kit__row">
      <NavMenu brand="نمونه · برند" items={ITEMS} ctaLabel="درخواست مشاوره رایگان" ctaHref="/contact" />
      <PillButton variant="outline" onClick={() => setOpen(true)} data-testid="kit-open-dialog">
        باز کردن پنجره
      </PillButton>
      {open ? (
        <PageDialog title="درباره‌ی پروژه‌تان بگویید" eyebrow="نمونه" onClose={() => setOpen(false)}>
          <p>این فقط نمونه‌ی پنجره است. با Escape یا دکمه‌ی بستن بسته می‌شود.</p>
        </PageDialog>
      ) : null}
    </div>
  );
}
