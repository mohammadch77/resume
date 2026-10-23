/**
 * Developer-only pages (/dev/...): the design-system specimen and the cards the visual-regression tests compare against
 * the design export. They exist in development and never in production, unless a test run turns them on explicitly with
 * ENABLE_DEV_PAGES=true (playwright.config.ts does; no deployment ever sets it).
 */
export function devPagesEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" || env.ENABLE_DEV_PAGES === "true";
}
