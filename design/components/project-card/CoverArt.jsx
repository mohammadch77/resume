import React from "react";

const ARTS = {
  1: { bg: "var(--color-lapis-tint)", b: [
    { s: "8%", t: "14%", w: "54%", h: "72%", c: "var(--color-lapis)" },
    { e: "10%", bt: "14%", w: "22%", h: "30%", c: "var(--color-saffron)" },
    { e: "10%", t: "14%", w: "22%", h: "1px", c: "var(--color-ink)" } ] },
  2: { bg: "var(--color-ink)", b: [
    { s: "0", t: "0", w: "38%", h: "100%", c: "var(--color-lapis)" },
    { s: "48%", t: "20%", w: "30%", h: "40%", c: "var(--color-firouzeh)", r: "50%" },
    { s: "48%", bt: "18%", w: "44%", h: "1px", c: "var(--color-paper)" } ] },
  3: { bg: "var(--color-raised)", b: [
    { s: "10%", t: "16%", w: "80%", h: "10%", c: "var(--color-ink)" },
    { s: "10%", t: "33%", w: "52%", h: "5%", c: "var(--color-line-strong)" },
    { s: "10%", t: "48%", w: "38%", h: "36%", c: "var(--color-lapis)" },
    { s: "52%", t: "48%", w: "38%", h: "36%", c: "var(--color-sunken)" } ] },
  4: { bg: "var(--color-lapis)", b: [
    { s: "14%", t: "16%", w: "34%", h: "68%", c: "var(--color-lapis-deep)" },
    { s: "52%", t: "16%", w: "34%", h: "34%", c: "var(--color-lapis-tint)" },
    { s: "52%", bt: "16%", w: "14%", h: "26%", c: "var(--color-firouzeh)" } ] },
};

export function CoverArt({ art = 1, image, alt = "", sample = false, sampleLabel = "نمونه", className = "", style }) {
  const a = ARTS[art] || ARTS[1];
  return (
    <div className={["gw-cover", className].filter(Boolean).join(" ")} style={style}>
      {image ? <img src={image} alt={alt} loading="lazy" /> : (
        <div className="gw-cover__art" style={{ background: a.bg }} aria-hidden="true">
          {a.b.map((x, i) => (
            <span key={i} style={{ insetInlineStart: x.s, insetInlineEnd: x.e, insetBlockStart: x.t, insetBlockEnd: x.bt, inlineSize: x.w, blockSize: x.h, background: x.c, borderRadius: x.r }} />
          ))}
        </div>
      )}
      {sample && <span className="gw-sample">{sampleLabel}</span>}
    </div>
  );
}
