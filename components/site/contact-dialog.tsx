"use client";

import { ContactForm } from "./contact-form";
import { PageDialog } from "./ui/client";

/** The contact form in the drop-in dialog. Loaded only when a visitor opens it (see site-launcher.tsx). */
export default function ContactDialog({ ctaLabel, onClose }: { ctaLabel: string; onClose: () => void }) {
  return (
    <PageDialog title="درباره‌ی پروژه‌تان بگویید" initialFocus="input" onClose={onClose}>
      <p className="lm-dialog__lead">نیازتان را بنویسید؛ مسیر پیشنهادی را با هم بررسی می‌کنیم.</p>
      <ContactForm ctaLabel={ctaLabel} />
    </PageDialog>
  );
}
