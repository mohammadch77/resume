import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Arrow } from "./icons";

export type PillVariant = "dark" | "light" | "outline" | "accent";

type Common = { variant?: PillVariant; arrow?: "forward" | "up"; children: ReactNode; className?: string };
type AsLink = Common & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">;
type AsButton = Common & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;
export type PillButtonProps = AsLink | AsButton;

/** The page's one button shape: a pill, with an optional round arrow badge at its end. A real link when it has an href. */
export function PillButton(props: PillButtonProps) {
  const { variant = "dark", arrow, children, className, ...rest } = props;
  const cls = ["lm-pill", `lm-pill--${variant}`, arrow ? "lm-pill--arrow" : "", className ?? ""].filter(Boolean).join(" ");
  const inner = (
    <>
      <span>{children}</span>
      {arrow ? (
        <span className="lm-pill__badge">
          <span className={`lm-pill__icon lm-pill__icon--${arrow}`}>
            <Arrow kind={arrow} />
          </span>
        </span>
      ) : null}
    </>
  );
  if (props.href !== undefined) {
    const anchor = rest as Omit<AsLink, keyof Common>;
    return (
      <a {...anchor} className={cls}>
        {inner}
      </a>
    );
  }
  const button = rest as Omit<AsButton, keyof Common>;
  return (
    <button type="button" {...button} className={cls}>
      {inner}
    </button>
  );
}
