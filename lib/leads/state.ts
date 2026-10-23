/**
 * The contact form's state, in a module with NO imports on purpose: the client form needs these types and `IDLE`, and
 * importing them from lib/leads/submit.ts would drag zod and the database schema into the browser bundle (it did: ~30 KB
 * gzip of zod alone, measured by Lighthouse). Keep this file import-free.
 */
export type ContactField = "name" | "phone" | "message";

export type ContactState = {
  status: "idle" | "sent" | "error";
  /** A message for the whole form (rate limit, server problem). */
  message?: string;
  fieldErrors?: Partial<Record<ContactField, string>>;
  /** What the visitor typed, so a failed submit does not empty the form. */
  values?: Record<ContactField, string>;
};

export const IDLE: ContactState = { status: "idle" };
