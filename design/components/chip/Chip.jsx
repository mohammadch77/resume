import React from "react";
import { Icon } from "../icon/Icon.jsx";

const STATUS_ICON = { success: "circle-check", warning: "triangle-alert", danger: "circle-x" };

export function Chip({ variant = "tag", selected = false, onClick, icon, className = "", children, ...rest }) {
  const cls = ["gw-chip", "gw-chip--" + variant, className].filter(Boolean).join(" ");
  if (variant === "filter") {
    return (
      <button type="button" className={cls} aria-pressed={selected} onClick={onClick} {...rest}>
        {selected && <Icon name="check" />}
        {children}
      </button>
    );
  }
  const ic = icon || STATUS_ICON[variant];
  return <span className={cls} {...rest}>{ic && <Icon name={ic} />}{children}</span>;
}
