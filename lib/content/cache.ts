/**
 * Cache tags for public content. Public pages read through `unstable_cache` with these tags;
 * admin Server Actions call `invalidateContent` after a successful change.
 */
export const CONTENT_TAGS = {
  projects: "content:projects",
  services: "content:services",
  clients: "content:clients",
  testimonials: "content:testimonials",
  settings: "content:settings",
} as const;

export type ContentTag = (typeof CONTENT_TAGS)[keyof typeof CONTENT_TAGS];
