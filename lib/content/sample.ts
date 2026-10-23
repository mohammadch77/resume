/**
 * Demo content carries the label «نمونه» at the start of its title or summary (scripts/seed.ts writes it, the design
 * system uses the same word for placeholders). It must never reach a visitor. The rule is a PREFIX on purpose: the word
 * appears inside real copy all the time («نمونه‌کار», «نمونه‌ی اول»), and hiding that would be a bug.
 */
export const SAMPLE_LABEL = "نمونه";

export const isSampleText = (text: string | null | undefined): boolean => (text ?? "").trim().startsWith(SAMPLE_LABEL);

/** True when any of the texts is demo-labelled. */
export const isSample = (...texts: Array<string | null | undefined>): boolean => texts.some(isSampleText);
