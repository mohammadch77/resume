import { serializeJsonLd } from "@/lib/seo/json-ld";

/** Structured data. The text is escaped by serializeJsonLd, so no string from the database can close the script element. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
