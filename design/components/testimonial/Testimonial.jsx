import React from "react";

export function Testimonial({ quote, name, role, sample = false, className = "", style }) {
  return (
    <figure className={["gw-quote", className].filter(Boolean).join(" ")} style={style}>
      <blockquote className="gw-quote__text"><p style={{ margin: 0 }}>{quote}</p></blockquote>
      <figcaption className="gw-quote__by">
        <span className="gw-quote__name">{name}</span>
        {role && <span className="gw-quote__role">{role}</span>}
        {sample && <span className="gw-sample">نمونه</span>}
      </figcaption>
    </figure>
  );
}
