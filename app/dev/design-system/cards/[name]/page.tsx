import { notFound } from "next/navigation";
import { CARD_NAMES, CardPage, type CardName } from "@/components/dev/cards";

/** One page per design-export card, rendered with our components (compared by tests/e2e/design-system.spec.ts). */
export default async function DesignCard({ params }: PageProps<"/dev/design-system/cards/[name]">) {
  const { name } = await params;
  if (!(CARD_NAMES as string[]).includes(name)) notFound();
  return <CardPage name={name as CardName} />;
}
