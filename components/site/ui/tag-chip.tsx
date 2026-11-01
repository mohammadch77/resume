import type { ReactNode } from "react";

/** An outlined pill for a tag. `tone="light"` is for ink cards (white outline), `dark` for light grounds. */
export function TagChip({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return <span className={`lm-chip lm-chip--${tone}`}>{children}</span>;
}
