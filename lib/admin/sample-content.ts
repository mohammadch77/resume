import { isSampleText } from "@/lib/content/sample";
import { PUBLISH_GATE_REASONS } from "@/lib/db/errors";
import { BlockedError } from "./outcome";

export { isSampleText, SAMPLE_LABEL } from "@/lib/content/sample";

/**
 * Sample content must be replaced before it goes public (CLAUDE.md section 6). Sample rows have no cover or service,
 * so the database gate already stops projects, but services and testimonials have no such columns; this check
 * covers all of them in one place. Throws BlockedError so `guard` reports it like any other publish rule.
 */
export function refuseSampleContent(...texts: string[]): void {
  if (texts.some(isSampleText)) throw new BlockedError([PUBLISH_GATE_REASONS.demo_content]);
}
