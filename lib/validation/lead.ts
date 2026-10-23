import { z } from "zod";
import { optionalText } from "./common";

export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost", "spam"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "جدید",
  contacted: "تماس گرفته شد",
  qualified: "واجد شرایط",
  won: "موفق",
  lost: "از دست رفته",
  spam: "هرزنامه",
};

/** What an editor may change on a lead. Everything else is what the visitor submitted and stays as it was. */
export const leadUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  internalNotes: optionalText("یادداشت", 4000),
});

export type LeadUpdateValues = z.infer<typeof leadUpdateSchema>;
