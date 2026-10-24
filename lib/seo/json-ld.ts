/**
 * JSON for a `<script type="application/ld+json">` body. JSON.stringify leaves `<`, `>` and `&` alone, so a string such as
 * `</script><img onerror=...>` coming from the database would close the element and start markup. Those three are written
 * as \u escapes (valid JSON, same value after parsing), and so are U+2028/U+2029, which JSON allows but JavaScript
 * string literals historically did not.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
