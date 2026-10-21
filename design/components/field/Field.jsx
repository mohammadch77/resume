import React from "react";
import { Icon } from "../icon/Icon.jsx";

export function Field({ label, hint, error, multiline = false, optional = false, id, disabled, className = "", ...rest }) {
  const auto = React.useId();
  const fid = id || "gw-f" + auto.replace(/:/g, "");
  const hintId = hint ? fid + "-hint" : undefined;
  const errId = error ? fid + "-err" : undefined;
  const Ctrl = multiline ? "textarea" : "input";
  return (
    <div className={["gw-field", error && "is-invalid", disabled && "is-disabled", className].filter(Boolean).join(" ")}>
      <label className="gw-field__label" htmlFor={fid}>
        {label}
        {optional && <span className="gw-field__optional"> (اختیاری)</span>}
      </label>
      <Ctrl id={fid} className="gw-field__control" disabled={disabled} aria-invalid={error ? true : undefined} aria-describedby={[errId, hintId].filter(Boolean).join(" ") || undefined} {...rest} />
      {hint && <p className="gw-field__hint" id={hintId}>{hint}</p>}
      {error && <p className="gw-field__error" id={errId}><Icon name="circle-alert" />{error}</p>}
    </div>
  );
}
