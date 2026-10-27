"use client";

import { Dialog } from "@/components/ds";
import { ContactForm } from "./contact-form";

/** The contact form in the design system's drop-in dialog. Loaded only when a visitor opens it (see contact-launcher.tsx). */
export default function ContactDialog({ ctaLabel, onClose }: { ctaLabel: string; onClose: () => void }) {
  return (
    <Dialog title="درباره‌ی پروژه‌تان بگویید" initialFocus="input" onClose={onClose}>
      <p className="lk-lead lk-dialog__lead">نیازتان را بنویسید؛ مسیر پیشنهادی را با هم بررسی می‌کنیم.</p>
      <ContactForm ctaLabel={ctaLabel} />
    </Dialog>
  );
}
