"use client";

import type { ContactTexts } from "@/lib/site/contact-texts";
import { ContactForm } from "./contact-form";
import { PageDialog } from "./ui/client";

/** The contact form in the drop-in dialog. Loaded only when a visitor opens it (see site-launcher.tsx). */
export default function ContactDialog({ ctaLabel, contact, onClose }: { ctaLabel: string; contact: ContactTexts; onClose: () => void }) {
  return (
    <PageDialog title={contact.title} initialFocus="input" onClose={onClose}>
      <p className="lm-dialog__lead">{contact.lead}</p>
      <ContactForm ctaLabel={ctaLabel} note={contact.note} />
    </PageDialog>
  );
}
