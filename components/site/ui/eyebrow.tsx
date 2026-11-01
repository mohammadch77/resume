import type { ReactNode } from "react";

/** A small label with a leading dot. `tone="light"` is for ink panels; `bordered` wraps it in a hairline pill (section openers). */
export function Eyebrow({ children, tone = "dark", bordered = false }: { children: ReactNode; tone?: "dark" | "light"; bordered?: boolean }) {
  return <span className={`lm-eyebrow lm-eyebrow--${tone}${bordered ? " lm-eyebrow--bordered" : ""}`}>{children}</span>;
}
