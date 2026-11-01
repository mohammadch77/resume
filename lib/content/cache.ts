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
  /** home_content, hero_cards, home_stats: the texts, figures and pictures of the landing page. */
  home: "content:home",
} as const;

export type ContentTag = (typeof CONTENT_TAGS)[keyof typeof CONTENT_TAGS];
