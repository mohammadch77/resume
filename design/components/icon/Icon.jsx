import React from "react";

const CDN = "https://unpkg.com/lucide-static@0.460.0/icons/";
const cache = new Map();
function load(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(CDN + name + ".svg")
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => t.replace(/<!--[\s\S]*?-->/g, "").replace(/stroke-width="[^"]*"/, 'stroke-width="1.5"').replace(/\s(width|height|class)="[^"]*"/g, ""))
      .catch(() => ""));
  }
  return cache.get(name);
}

/** Lucide line icon (1.5px stroke), loaded from CDN and inlined so it inherits currentColor. */
export function Icon({ name, size, mirror = false, label, className = "", style }) {
  const [svg, setSvg] = React.useState("");
  React.useEffect(() => {
    let live = true;
    load(name).then((s) => live && setSvg(s));
    return () => { live = false; };
  }, [name]);
  return (
    <span
      className={["gw-icon", mirror && "gw-icon--mirror", className].filter(Boolean).join(" ")}
      style={{ ...(size ? { "--gw-icon-size": size + "px" } : {}), ...style }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
