import React from "react";

export function Metric({ value, label, source, sample = false, className = "", style }) {
  return (
    <div className={["gw-metric", className].filter(Boolean).join(" ")} style={style}>
      <p className="gw-metric__value">{value}</p>
      <p className="gw-metric__label">{label}</p>
      {(source || sample) && <p className="gw-metric__source">{sample && <span className="gw-sample">نمونه</span>}{source}</p>}
    </div>
  );
}
