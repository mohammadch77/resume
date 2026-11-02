/**
 * Developer-only pages (/dev/...): the kit specimen (/dev/lumora-kit) and the landing preview. They exist in development and never in production, unless a test run turns them on explicitly with
 * ENABLE_DEV_PAGES=true (playwright.config.ts does; no deployment ever sets it).
 */
export function devPagesEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" || env.ENABLE_DEV_PAGES === "true";
}
