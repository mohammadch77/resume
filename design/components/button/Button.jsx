import React from "react";
import { Icon } from "../icon/Icon.jsx";

export function Button({ variant = "primary", size = "md", href, iconStart, iconEnd, iconOnly, label, disabled, type = "button", className = "", children, ...rest }) {
  const cls = ["gw-btn", "gw-btn--" + variant, size === "sm" && "gw-btn--sm", iconOnly && "gw-btn--icon", className].filter(Boolean).join(" ");
  const inner = (
    <>
      {iconStart && <Icon name={iconStart} />}
      {iconOnly ? <Icon name={iconOnly} /> : children}
      {iconEnd && <Icon name={iconEnd} />}
    </>
  );
  if (href) {
    return <a className={cls} href={disabled ? undefined : href} aria-disabled={disabled || undefined} aria-label={iconOnly ? label : undefined} {...rest}>{inner}</a>;
  }
  return <button type={type} className={cls} disabled={disabled} aria-label={iconOnly ? label : undefined} {...rest}>{inner}</button>;
}
