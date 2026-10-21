/* @ds-bundle: {"format":4,"namespace":"GrinWebDesignSystem_8caadf","components":[{"name":"Button","sourcePath":"components/button/Button.jsx"},{"name":"Chip","sourcePath":"components/chip/Chip.jsx"},{"name":"Field","sourcePath":"components/field/Field.jsx"},{"name":"Icon","sourcePath":"components/icon/Icon.jsx"},{"name":"Metric","sourcePath":"components/metric/Metric.jsx"},{"name":"Modal","sourcePath":"components/modal/Modal.jsx"},{"name":"Navbar","sourcePath":"components/navbar/Navbar.jsx"},{"name":"CoverArt","sourcePath":"components/project-card/CoverArt.jsx"},{"name":"CropFrame","sourcePath":"components/project-card/CropFrame.jsx"},{"name":"ProjectCard","sourcePath":"components/project-card/ProjectCard.jsx"},{"name":"Testimonial","sourcePath":"components/testimonial/Testimonial.jsx"}],"sourceHashes":{"components/button/Button.jsx":"1b52029423e6","components/chip/Chip.jsx":"15f40bd83e16","components/field/Field.jsx":"62bc34428a0c","components/icon/Icon.jsx":"9153d9d51b15","components/metric/Metric.jsx":"7268e546b36e","components/modal/Modal.jsx":"f5059d11ae28","components/navbar/Navbar.jsx":"2cd04465ae6a","components/project-card/CoverArt.jsx":"0cc8d5e7cde4","components/project-card/CropFrame.jsx":"e318d76ec5ef","components/project-card/ProjectCard.jsx":"d5a94b7c55e9","components/testimonial/Testimonial.jsx":"0acef295099e","ui_kits/landing/Landing.jsx":"85502d2360c7","ui_kits/landing/data.js":"ffb6be9edfd4"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.GrinWebDesignSystem_8caadf = window.GrinWebDesignSystem_8caadf || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/icon/Icon.jsx
try { (() => {
const CDN = "https://unpkg.com/lucide-static@0.460.0/icons/";
const cache = new Map();
function load(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(CDN + name + ".svg").then(r => r.ok ? r.text() : "").then(t => t.replace(/<!--[\s\S]*?-->/g, "").replace(/stroke-width="[^"]*"/, 'stroke-width="1.5"').replace(/\s(width|height|class)="[^"]*"/g, "")).catch(() => ""));
  }
  return cache.get(name);
}

/** Lucide line icon (1.5px stroke), loaded from CDN and inlined so it inherits currentColor. */
function Icon({
  name,
  size,
  mirror = false,
  label,
  className = "",
  style
}) {
  const [svg, setSvg] = React.useState("");
  React.useEffect(() => {
    let live = true;
    load(name).then(s => live && setSvg(s));
    return () => {
      live = false;
    };
  }, [name]);
  return /*#__PURE__*/React.createElement("span", {
    className: ["gw-icon", mirror && "gw-icon--mirror", className].filter(Boolean).join(" "),
    style: {
      ...(size ? {
        "--gw-icon-size": size + "px"
      } : {}),
      ...style
    },
    role: label ? "img" : undefined,
    "aria-label": label,
    "aria-hidden": label ? undefined : true,
    dangerouslySetInnerHTML: {
      __html: svg
    }
  });
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/icon/Icon.jsx", error: String((e && e.message) || e) }); }

// components/button/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = "primary",
  size = "md",
  href,
  iconStart,
  iconEnd,
  iconOnly,
  label,
  disabled,
  type = "button",
  className = "",
  children,
  ...rest
}) {
  const cls = ["gw-btn", "gw-btn--" + variant, size === "sm" && "gw-btn--sm", iconOnly && "gw-btn--icon", className].filter(Boolean).join(" ");
  const inner = /*#__PURE__*/React.createElement(React.Fragment, null, iconStart && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconStart
  }), iconOnly ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconOnly
  }) : children, iconEnd && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconEnd
  }));
  if (href) {
    return /*#__PURE__*/React.createElement("a", _extends({
      className: cls,
      href: disabled ? undefined : href,
      "aria-disabled": disabled || undefined,
      "aria-label": iconOnly ? label : undefined
    }, rest), inner);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls,
    disabled: disabled,
    "aria-label": iconOnly ? label : undefined
  }, rest), inner);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/button/Button.jsx", error: String((e && e.message) || e) }); }

// components/chip/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STATUS_ICON = {
  success: "circle-check",
  warning: "triangle-alert",
  danger: "circle-x"
};
function Chip({
  variant = "tag",
  selected = false,
  onClick,
  icon,
  className = "",
  children,
  ...rest
}) {
  const cls = ["gw-chip", "gw-chip--" + variant, className].filter(Boolean).join(" ");
  if (variant === "filter") {
    return /*#__PURE__*/React.createElement("button", _extends({
      type: "button",
      className: cls,
      "aria-pressed": selected,
      onClick: onClick
    }, rest), selected && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "check"
    }), children);
  }
  const ic = icon || STATUS_ICON[variant];
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), ic && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: ic
  }), children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chip/Chip.jsx", error: String((e && e.message) || e) }); }

// components/field/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Field({
  label,
  hint,
  error,
  multiline = false,
  optional = false,
  id,
  disabled,
  className = "",
  ...rest
}) {
  const auto = React.useId();
  const fid = id || "gw-f" + auto.replace(/:/g, "");
  const hintId = hint ? fid + "-hint" : undefined;
  const errId = error ? fid + "-err" : undefined;
  const Ctrl = multiline ? "textarea" : "input";
  return /*#__PURE__*/React.createElement("div", {
    className: ["gw-field", error && "is-invalid", disabled && "is-disabled", className].filter(Boolean).join(" ")
  }, /*#__PURE__*/React.createElement("label", {
    className: "gw-field__label",
    htmlFor: fid
  }, label, optional && /*#__PURE__*/React.createElement("span", {
    className: "gw-field__optional"
  }, " (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)")), /*#__PURE__*/React.createElement(Ctrl, _extends({
    id: fid,
    className: "gw-field__control",
    disabled: disabled,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [errId, hintId].filter(Boolean).join(" ") || undefined
  }, rest)), hint && /*#__PURE__*/React.createElement("p", {
    className: "gw-field__hint",
    id: hintId
  }, hint), error && /*#__PURE__*/React.createElement("p", {
    className: "gw-field__error",
    id: errId
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "circle-alert"
  }), error));
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/field/Field.jsx", error: String((e && e.message) || e) }); }

// components/metric/Metric.jsx
try { (() => {
function Metric({
  value,
  label,
  source,
  sample = false,
  className = "",
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["gw-metric", className].filter(Boolean).join(" "),
    style: style
  }, /*#__PURE__*/React.createElement("p", {
    className: "gw-metric__value"
  }, value), /*#__PURE__*/React.createElement("p", {
    className: "gw-metric__label"
  }, label), (source || sample) && /*#__PURE__*/React.createElement("p", {
    className: "gw-metric__source"
  }, sample && /*#__PURE__*/React.createElement("span", {
    className: "gw-sample"
  }, "\u0646\u0645\u0648\u0646\u0647"), source));
}
Object.assign(__ds_scope, { Metric });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/metric/Metric.jsx", error: String((e && e.message) || e) }); }

// components/navbar/Navbar.jsx
try { (() => {
function Navbar({
  brand = "Grin Web",
  brandHref = "#top",
  links = [],
  current,
  ctaLabel = "درخواست مشاوره رایگان",
  ctaHref = "#contact",
  className = "",
  style
}) {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement("nav", {
    className: ["gw-nav", open && "is-open", className].filter(Boolean).join(" "),
    "aria-label": "\u0646\u0627\u0648\u0628\u0631\u06CC \u0627\u0635\u0644\u06CC",
    style: style
  }, /*#__PURE__*/React.createElement("a", {
    className: "gw-nav__brand",
    href: brandHref,
    lang: "en",
    dir: "ltr"
  }, brand), /*#__PURE__*/React.createElement("ul", {
    className: "gw-nav__links"
  }, links.map(l => /*#__PURE__*/React.createElement("li", {
    key: l.href
  }, /*#__PURE__*/React.createElement("a", {
    className: "gw-nav__link",
    href: l.href,
    "aria-current": current === l.href ? "location" : undefined
  }, l.label)))), /*#__PURE__*/React.createElement("div", {
    className: "gw-nav__end"
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    href: ctaHref
  }, ctaLabel), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "quiet",
    className: "gw-nav__menu",
    iconOnly: open ? "x" : "menu",
    label: open ? "بستن منو" : "منو",
    "aria-expanded": open,
    onClick: () => setOpen(!open)
  })), /*#__PURE__*/React.createElement("div", {
    className: "gw-nav__sheet"
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l.href,
    className: "gw-nav__link",
    href: l.href,
    onClick: () => setOpen(false)
  }, l.label)), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    href: ctaHref,
    onClick: () => setOpen(false)
  }, ctaLabel)));
}
Object.assign(__ds_scope, { Navbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navbar/Navbar.jsx", error: String((e && e.message) || e) }); }

// components/project-card/CoverArt.jsx
try { (() => {
const ARTS = {
  1: {
    bg: "var(--color-lapis-tint)",
    b: [{
      s: "8%",
      t: "14%",
      w: "54%",
      h: "72%",
      c: "var(--color-lapis)"
    }, {
      e: "10%",
      bt: "14%",
      w: "22%",
      h: "30%",
      c: "var(--color-saffron)"
    }, {
      e: "10%",
      t: "14%",
      w: "22%",
      h: "1px",
      c: "var(--color-ink)"
    }]
  },
  2: {
    bg: "var(--color-ink)",
    b: [{
      s: "0",
      t: "0",
      w: "38%",
      h: "100%",
      c: "var(--color-lapis)"
    }, {
      s: "48%",
      t: "20%",
      w: "30%",
      h: "40%",
      c: "var(--color-firouzeh)",
      r: "50%"
    }, {
      s: "48%",
      bt: "18%",
      w: "44%",
      h: "1px",
      c: "var(--color-paper)"
    }]
  },
  3: {
    bg: "var(--color-raised)",
    b: [{
      s: "10%",
      t: "16%",
      w: "80%",
      h: "10%",
      c: "var(--color-ink)"
    }, {
      s: "10%",
      t: "33%",
      w: "52%",
      h: "5%",
      c: "var(--color-line-strong)"
    }, {
      s: "10%",
      t: "48%",
      w: "38%",
      h: "36%",
      c: "var(--color-lapis)"
    }, {
      s: "52%",
      t: "48%",
      w: "38%",
      h: "36%",
      c: "var(--color-sunken)"
    }]
  },
  4: {
    bg: "var(--color-lapis)",
    b: [{
      s: "14%",
      t: "16%",
      w: "34%",
      h: "68%",
      c: "var(--color-lapis-deep)"
    }, {
      s: "52%",
      t: "16%",
      w: "34%",
      h: "34%",
      c: "var(--color-lapis-tint)"
    }, {
      s: "52%",
      bt: "16%",
      w: "14%",
      h: "26%",
      c: "var(--color-firouzeh)"
    }]
  }
};
function CoverArt({
  art = 1,
  image,
  alt = "",
  sample = false,
  sampleLabel = "نمونه",
  className = "",
  style
}) {
  const a = ARTS[art] || ARTS[1];
  return /*#__PURE__*/React.createElement("div", {
    className: ["gw-cover", className].filter(Boolean).join(" "),
    style: style
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: alt,
    loading: "lazy"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "gw-cover__art",
    style: {
      background: a.bg
    },
    "aria-hidden": "true"
  }, a.b.map((x, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      insetInlineStart: x.s,
      insetInlineEnd: x.e,
      insetBlockStart: x.t,
      insetBlockEnd: x.bt,
      inlineSize: x.w,
      blockSize: x.h,
      background: x.c,
      borderRadius: x.r
    }
  }))), sample && /*#__PURE__*/React.createElement("span", {
    className: "gw-sample"
  }, sampleLabel));
}
Object.assign(__ds_scope, { CoverArt });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/project-card/CoverArt.jsx", error: String((e && e.message) || e) }); }

// components/project-card/CropFrame.jsx
try { (() => {
function CropFrame({
  gap,
  className = "",
  style,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: ["gw-crop-frame", className].filter(Boolean).join(" "),
    style: {
      ...(gap ? {
        "--gw-crop-gap": gap + "px"
      } : {}),
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "gw-crop gw-crop--ts",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "gw-crop gw-crop--te",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "gw-crop gw-crop--bs",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "gw-crop gw-crop--be",
    "aria-hidden": "true"
  }), children);
}
Object.assign(__ds_scope, { CropFrame });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/project-card/CropFrame.jsx", error: String((e && e.message) || e) }); }

// components/modal/Modal.jsx
try { (() => {
function Modal({
  open = true,
  onClose,
  title,
  tags = [],
  art = 1,
  image,
  alt,
  sample = false,
  challenge,
  solution,
  outcome,
  labels,
  primaryLabel = "درخواست مشاوره رایگان",
  primaryHref,
  onPrimary,
  secondaryLabel = "بستن",
  onSecondary,
  contained = false,
  className = ""
}) {
  const ref = React.useRef(null);
  const L = {
    challenge: "چالش",
    solution: "راه‌حل",
    outcome: "نتیجه",
    ...labels
  };
  const titleId = React.useId().replace(/:/g, "") + "-t";
  React.useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const node = ref.current;
    if (!contained) node && node.querySelector("button")?.focus();
    const onKey = e => {
      if (e.key === "Escape") {
        onClose && onClose();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const f = node.querySelectorAll('a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node && node.addEventListener("keydown", onKey);
    const ov = document.body.style.overflow;
    if (!contained) document.body.style.overflow = "hidden";
    return () => {
      node && node.removeEventListener("keydown", onKey);
      document.body.style.overflow = ov;
      prev && prev.focus && !contained && prev.focus();
    };
  }, [open, contained]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "gw-scrim" + (contained ? " gw-scrim--contained" : ""),
    onMouseDown: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: ["gw-modal", className].filter(Boolean).join(" "),
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": titleId
  }, /*#__PURE__*/React.createElement("header", {
    className: "gw-modal__head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "gw-modal__titles"
  }, tags.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "gw-chip-row"
  }, tags.map(t => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: t
  }, t))), /*#__PURE__*/React.createElement("h2", {
    className: "gw-modal__title",
    id: titleId
  }, title)), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "quiet",
    className: "gw-modal__close",
    iconOnly: "x",
    label: "\u0628\u0633\u062A\u0646",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    className: "gw-modal__cover"
  }, /*#__PURE__*/React.createElement(__ds_scope.CropFrame, null, /*#__PURE__*/React.createElement(__ds_scope.CoverArt, {
    art: art,
    image: image,
    alt: alt,
    sample: sample
  }))), /*#__PURE__*/React.createElement("div", {
    className: "gw-modal__cols"
  }, /*#__PURE__*/React.createElement("section", {
    className: "gw-modal__col"
  }, /*#__PURE__*/React.createElement("h3", null, L.challenge), /*#__PURE__*/React.createElement("p", null, challenge)), /*#__PURE__*/React.createElement("section", {
    className: "gw-modal__col"
  }, /*#__PURE__*/React.createElement("h3", null, L.solution), /*#__PURE__*/React.createElement("p", null, solution)), /*#__PURE__*/React.createElement("section", {
    className: "gw-modal__col"
  }, /*#__PURE__*/React.createElement("h3", null, L.outcome), /*#__PURE__*/React.createElement("p", null, outcome))), /*#__PURE__*/React.createElement("footer", {
    className: "gw-modal__actions"
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    href: primaryHref,
    onClick: onPrimary
  }, primaryLabel), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    onClick: onSecondary || onClose
  }, secondaryLabel))));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/modal/Modal.jsx", error: String((e && e.message) || e) }); }

// components/project-card/ProjectCard.jsx
try { (() => {
function ProjectCard({
  title,
  summary,
  tags = [],
  art = 1,
  image,
  alt,
  sample = true,
  ctaLabel = "مشاهده‌ی جزئیات پروژه",
  onOpen,
  href,
  headingLevel = 3,
  className = "",
  style
}) {
  const H = "h" + headingLevel;
  return /*#__PURE__*/React.createElement("article", {
    className: ["gw-project", className].filter(Boolean).join(" "),
    style: style
  }, /*#__PURE__*/React.createElement(__ds_scope.CropFrame, null, /*#__PURE__*/React.createElement(__ds_scope.CoverArt, {
    art: art,
    image: image,
    alt: alt,
    sample: sample
  })), /*#__PURE__*/React.createElement("div", {
    className: "gw-project__body"
  }, tags.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "gw-chip-row"
  }, tags.slice(0, 4).map(t => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: t
  }, t))), /*#__PURE__*/React.createElement(H, {
    className: "gw-project__title"
  }, title), summary && /*#__PURE__*/React.createElement("p", {
    className: "gw-project__summary"
  }, summary), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "quiet",
    className: "gw-project__cta",
    iconEnd: "arrow-left",
    href: href,
    onClick: onOpen
  }, ctaLabel)));
}
Object.assign(__ds_scope, { ProjectCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/project-card/ProjectCard.jsx", error: String((e && e.message) || e) }); }

// components/testimonial/Testimonial.jsx
try { (() => {
function Testimonial({
  quote,
  name,
  role,
  sample = false,
  className = "",
  style
}) {
  return /*#__PURE__*/React.createElement("figure", {
    className: ["gw-quote", className].filter(Boolean).join(" "),
    style: style
  }, /*#__PURE__*/React.createElement("blockquote", {
    className: "gw-quote__text"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, quote)), /*#__PURE__*/React.createElement("figcaption", {
    className: "gw-quote__by"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gw-quote__name"
  }, name), role && /*#__PURE__*/React.createElement("span", {
    className: "gw-quote__role"
  }, role), sample && /*#__PURE__*/React.createElement("span", {
    className: "gw-sample"
  }, "\u0646\u0645\u0648\u0646\u0647")));
}
Object.assign(__ds_scope, { Testimonial });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/testimonial/Testimonial.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/Landing.jsx
try { (() => {
const {
  Navbar,
  Button,
  Chip,
  Field,
  ProjectCard,
  Metric,
  Testimonial,
  Modal,
  CropFrame,
  CoverArt,
  Icon
} = window.GrinWebDesignSystem_8caadf;
const D = window.LK_DATA;
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    className: "lk-wrap lk-hero",
    id: "top"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "\u0633\u0627\u06CC\u062A \u0648 \u0646\u0631\u0645\u200C\u0627\u0641\u0632\u0627\u0631\u06CC \u06A9\u0647 \u06A9\u0633\u0628\u200C\u0648\u06A9\u0627\u0631\u062A\u0627\u0646 \u0631\u0627 \u062C\u0644\u0648 \u0645\u06CC\u200C\u0628\u0631\u062F"), /*#__PURE__*/React.createElement("p", {
    className: "lk-lead"
  }, "\u0628\u0631\u0627\u06CC \u0634\u0631\u06A9\u062A\u200C\u0647\u0627 \u0648 \u0641\u0631\u0648\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u0648\u0628\u200C\u0633\u0627\u06CC\u062A \u0648 \u0646\u0631\u0645\u200C\u0627\u0641\u0632\u0627\u0631 \u0627\u062E\u062A\u0635\u0627\u0635\u06CC \u0645\u06CC\u200C\u0633\u0627\u0632\u06CC\u0645\u061B \u0633\u0631\u06CC\u0639\u060C \u0642\u0627\u0628\u0644\u200C\u0645\u062F\u06CC\u0631\u06CC\u062A \u0648 \u0628\u0627 \u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F\u06CC \u0631\u0648\u0634\u0646."), /*#__PURE__*/React.createElement("div", {
    className: "lk-actions"
  }, /*#__PURE__*/React.createElement(Button, {
    href: "#contact"
  }, D.cta), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    href: "#work"
  }, "\u0645\u0634\u0627\u0647\u062F\u0647 \u0646\u0645\u0648\u0646\u0647\u200C\u06A9\u0627\u0631\u0647\u0627")), /*#__PURE__*/React.createElement("p", {
    className: "lk-proof"
  }, "[\u062A\u0639\u062F\u0627\u062F] \u067E\u0631\u0648\u0698\u0647\u200C\u06CC \u062A\u062D\u0648\u06CC\u0644\u200C\u0634\u062F\u0647 \xB7 [\u062A\u0639\u062F\u0627\u062F] \u0633\u0627\u0644 \u062A\u062C\u0631\u0628\u0647 \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "gw-sample"
  }, "\u0646\u0645\u0648\u0646\u0647"))), /*#__PURE__*/React.createElement("div", {
    className: "lk-art",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lk-art__block"
  }), /*#__PURE__*/React.createElement("div", {
    className: "lk-art__a"
  }, /*#__PURE__*/React.createElement(CropFrame, null, /*#__PURE__*/React.createElement(CoverArt, {
    art: 3
  }))), /*#__PURE__*/React.createElement("div", {
    className: "lk-art__b"
  }, /*#__PURE__*/React.createElement(CropFrame, null, /*#__PURE__*/React.createElement(CoverArt, {
    art: 1,
    sample: true
  })))));
}
function Work({
  onOpen
}) {
  const [f, setF] = React.useState("همه");
  const [i, setI] = React.useState(0);
  const ref = React.useRef(null);
  const list = D.projects.filter(p => f === "همه" || p.cat === f);
  const fa = n => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const step = 452;
    setI(Math.min(list.length - 1, Math.round(Math.abs(el.scrollLeft) / step)));
  };
  React.useEffect(() => {
    setI(0);
    ref.current && (ref.current.scrollLeft = 0);
  }, [f]);
  return /*#__PURE__*/React.createElement("section", {
    className: "lk-sec lk-sec--sunken",
    id: "work"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lk-wrap lk-strip-head"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "lk-h2"
  }, "\u0646\u0645\u0648\u0646\u0647\u200C\u06A9\u0627\u0631\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628"), /*#__PURE__*/React.createElement("div", {
    className: "gw-chip-row",
    role: "group",
    "aria-label": "\u0641\u06CC\u0644\u062A\u0631 \u0646\u0645\u0648\u0646\u0647\u200C\u06A9\u0627\u0631\u0647\u0627"
  }, D.filters.map(x => /*#__PURE__*/React.createElement(Chip, {
    key: x,
    variant: "filter",
    selected: f === x,
    onClick: () => setF(x)
  }, x)))), /*#__PURE__*/React.createElement("div", {
    className: "lk-strip",
    ref: ref,
    onScroll: onScroll
  }, list.map(p => /*#__PURE__*/React.createElement(ProjectCard, {
    key: p.id,
    art: p.art,
    tags: p.tags,
    title: p.title,
    summary: p.summary,
    onOpen: () => onOpen(p)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "lk-wrap lk-progress"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lk-progress__track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lk-progress__bar",
    style: {
      inlineSize: (i + 1) / list.length * 100 + "%"
    }
  })), /*#__PURE__*/React.createElement("span", null, fa(i + 1), " \u0627\u0632 ", fa(list.length))));
}
function Services() {
  return /*#__PURE__*/React.createElement("section", {
    className: "lk-sec",
    id: "services"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lk-wrap"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "lk-h2"
  }, "\u062E\u062F\u0645\u0627\u062A"), /*#__PURE__*/React.createElement("div", {
    className: "lk-cols"
  }, D.services.map(s => /*#__PURE__*/React.createElement("div", {
    className: "lk-col",
    key: s.t
  }, /*#__PURE__*/React.createElement("h3", null, s.t), /*#__PURE__*/React.createElement("p", null, s.d), /*#__PURE__*/React.createElement("div", {
    className: "gw-chip-row"
  }, s.c.map(c => /*#__PURE__*/React.createElement(Chip, {
    key: c,
    variant: "outline"
  }, c))))))));
}
function Process() {
  return /*#__PURE__*/React.createElement("section", {
    className: "lk-sec",
    id: "process",
    style: {
      paddingBlockStart: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lk-wrap"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "lk-h2"
  }, "\u0631\u0648\u0634 \u06A9\u0627\u0631"), /*#__PURE__*/React.createElement("ol", {
    className: "lk-cols",
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0
    }
  }, D.steps.map((s, n) => /*#__PURE__*/React.createElement("li", {
    className: "lk-col",
    key: s.t
  }, /*#__PURE__*/React.createElement("span", {
    className: "lk-step-n"
  }, "۱۲۳۴"[n]), /*#__PURE__*/React.createElement("h3", null, s.t), /*#__PURE__*/React.createElement("p", null, s.d))))));
}
function Results() {
  return /*#__PURE__*/React.createElement("section", {
    className: "lk-sec lk-sec--sunken"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lk-wrap"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "lk-h2"
  }, "\u0646\u062A\u06CC\u062C\u0647\u200C\u0647\u0627"), /*#__PURE__*/React.createElement("div", {
    className: "lk-metrics"
  }, /*#__PURE__*/React.createElement(Metric, {
    value: "[\u0639\u062F\u062F]\u066A",
    label: "\u06A9\u0627\u0647\u0634 \u0632\u0645\u0627\u0646 \u062B\u0628\u062A \u0633\u0641\u0627\u0631\u0634",
    source: "\u067E\u0631\u0648\u0698\u0647\u200C\u06CC [\u0646\u0627\u0645 \u0645\u0634\u062A\u0631\u06CC]",
    sample: true
  }), /*#__PURE__*/React.createElement(Metric, {
    value: "[\u0639\u062F\u062F]",
    label: "\u067E\u0631\u0648\u0698\u0647\u200C\u06CC \u062A\u062D\u0648\u06CC\u0644\u200C\u0634\u062F\u0647",
    source: "\u06F1\u06F4\u06F0\u06F0 \u062A\u0627 \u06F1\u06F4\u06F0\u06F4",
    sample: true
  }), /*#__PURE__*/React.createElement(Metric, {
    value: "[\u0639\u062F\u062F]",
    label: "\u0631\u0648\u0632 \u062A\u0627 \u0646\u0633\u062E\u0647\u200C\u06CC \u0627\u0648\u0644",
    source: "\u0645\u06CC\u0627\u0646\u06AF\u06CC\u0646 \u067E\u0631\u0648\u0698\u0647\u200C\u0647\u0627",
    sample: true
  })), /*#__PURE__*/React.createElement("p", {
    className: "lk-note"
  }, "\u062F\u0627\u062F\u0647\u200C\u06CC \u0648\u0627\u0642\u0639\u06CC \u0627\u0632 \u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A \u062E\u0648\u0627\u0646\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F\u061B \u0627\u06AF\u0631 \u062F\u0627\u062F\u0647\u200C\u0627\u06CC \u0646\u0628\u0627\u0634\u062F\u060C \u0627\u06CC\u0646 \u0628\u062E\u0634 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F.")));
}
function Quote() {
  return /*#__PURE__*/React.createElement("section", {
    className: "lk-sec"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lk-wrap"
  }, /*#__PURE__*/React.createElement(Testimonial, {
    quote: "\xAB[\u0645\u062A\u0646 \u0646\u0638\u0631 \u0645\u0634\u062A\u0631\u06CC \u0627\u06CC\u0646\u062C\u0627 \u0642\u0631\u0627\u0631 \u0645\u06CC\u200C\u06AF\u06CC\u0631\u062F\u061B \u062F\u0648 \u062A\u0627 \u0686\u0647\u0627\u0631 \u062E\u0637\u060C \u0628\u062F\u0648\u0646 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0648 \u0628\u0627 \u0627\u062C\u0627\u0632\u0647\u200C\u06CC \u06A9\u062A\u0628\u06CC \u062E\u0648\u062F \u0627\u0648.]\xBB",
    name: "[\u0646\u0627\u0645 \u0645\u0634\u062A\u0631\u06CC]",
    role: "\u0645\u062F\u06CC\u0631 \u0645\u062D\u0635\u0648\u0644\u060C [\u0646\u0627\u0645 \u0634\u0631\u06A9\u062A]",
    sample: true
  })));
}
function Clients() {
  return /*#__PURE__*/React.createElement("section", {
    className: "lk-sec",
    id: "clients",
    style: {
      paddingBlockStart: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lk-wrap"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "lk-h2",
    style: {
      fontSize: "var(--text-heading-1)",
      lineHeight: "var(--text-heading-1--line-height)"
    }
  }, "\u0645\u0634\u062A\u0631\u06CC\u0627\u0646"), /*#__PURE__*/React.createElement("div", {
    className: "lk-logos"
  }, [1, 2, 3, 4, 5, 6].map(n => /*#__PURE__*/React.createElement("div", {
    className: "lk-logo",
    key: n
  }, "[\u0644\u0648\u06AF\u0648]")))));
}
function Contact() {
  const [sent, setSent] = React.useState(false);
  const [err, setErr] = React.useState("");
  const submit = e => {
    e.preventDefault();
    const ph = e.target.phone.value.trim();
    if (!/^(09|۰۹)/.test(ph)) {
      setErr("شماره را با ۰۹ شروع کنید.");
      return;
    }
    setErr("");
    setSent(true);
  };
  return /*#__PURE__*/React.createElement("section", {
    className: "lk-sec lk-sec--sunken",
    id: "contact"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lk-wrap lk-contact"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "lk-h2"
  }, "\u062F\u0631\u0628\u0627\u0631\u0647\u200C\u06CC \u067E\u0631\u0648\u0698\u0647\u200C\u062A\u0627\u0646 \u0628\u06AF\u0648\u06CC\u06CC\u062F"), /*#__PURE__*/React.createElement("p", {
    className: "lk-lead"
  }, "\u062F\u0631 \u06CC\u06A9 \u062C\u0644\u0633\u0647\u200C\u06CC \u06A9\u0648\u062A\u0627\u0647 \u0646\u06CC\u0627\u0632\u062A\u0627\u0646 \u0631\u0627 \u0645\u06CC\u200C\u0634\u0646\u0648\u06CC\u0645 \u0648 \u0645\u0633\u06CC\u0631 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC \u0631\u0627 \u0631\u0627\u06CC\u06AF\u0627\u0646 \u0645\u06CC\u200C\u06AF\u0648\u06CC\u06CC\u0645."), /*#__PURE__*/React.createElement("dl", null, /*#__PURE__*/React.createElement("dt", null, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: 18
  }), "\u062A\u0644\u0641\u0646"), /*#__PURE__*/React.createElement("dd", {
    dir: "ltr",
    style: {
      textAlign: "right"
    }
  }, "[\u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633]"), /*#__PURE__*/React.createElement("dt", null, /*#__PURE__*/React.createElement(Icon, {
    name: "mail",
    size: 18
  }), "\u0627\u06CC\u0645\u06CC\u0644"), /*#__PURE__*/React.createElement("dd", {
    dir: "ltr",
    style: {
      textAlign: "right"
    }
  }, "[\u0627\u06CC\u0645\u06CC\u0644]"), /*#__PURE__*/React.createElement("dt", null, /*#__PURE__*/React.createElement(Icon, {
    name: "map-pin",
    size: 18
  }), "\u0646\u0634\u0627\u0646\u06CC"), /*#__PURE__*/React.createElement("dd", null, "[\u0646\u0634\u0627\u0646\u06CC \u062F\u0641\u062A\u0631]"))), /*#__PURE__*/React.createElement("form", {
    className: "lk-form",
    onSubmit: submit,
    noValidate: true
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC",
    name: "name",
    autoComplete: "name",
    required: true
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\u0634\u0645\u0627\u0631\u0647 \u062A\u0645\u0627\u0633",
    name: "phone",
    type: "tel",
    dir: "ltr",
    inputMode: "tel",
    autoComplete: "tel",
    error: err || undefined,
    hint: err ? undefined : "فقط برای هماهنگی جلسه تماس می‌گیریم.",
    required: true
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\u062F\u0631\u0628\u0627\u0631\u0647\u200C\u06CC \u067E\u0631\u0648\u0698\u0647",
    name: "message",
    multiline: true,
    optional: true
  }), sent ? /*#__PURE__*/React.createElement("p", {
    className: "lk-sent",
    role: "status"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "circle-check"
  }), "\u062F\u0631\u062E\u0648\u0627\u0633\u062A\u062A\u0627\u0646 \u0631\u0633\u06CC\u062F. \u062A\u0627 \u06CC\u06A9 \u0631\u0648\u0632 \u06A9\u0627\u0631\u06CC \u062A\u0645\u0627\u0633 \u0645\u06CC\u200C\u06AF\u06CC\u0631\u06CC\u0645.") : /*#__PURE__*/React.createElement(Button, {
    type: "submit"
  }, D.cta), /*#__PURE__*/React.createElement("p", {
    className: "lk-note",
    style: {
      margin: 0
    }
  }, "\u0628\u0627 \u0627\u0631\u0633\u0627\u0644 \u0627\u06CC\u0646 \u0641\u0631\u0645\u060C \u0628\u0627 \u062A\u0645\u0627\u0633 \u0645\u0627 \u0628\u0631\u0627\u06CC \u0647\u0645\u0627\u0647\u0646\u06AF\u06CC \u062C\u0644\u0633\u0647 \u0645\u0648\u0627\u0641\u0642\u062A \u0645\u06CC\u200C\u06A9\u0646\u06CC\u062F."))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    className: "lk-foot"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lk-wrap"
  }, /*#__PURE__*/React.createElement("b", {
    dir: "ltr"
  }, "Grin Web"), /*#__PURE__*/React.createElement("small", null, "\xA9 \u06F1\u06F4\u06F0\u06F5 \u06AF\u0631\u06CC\u0646 \u0648\u0628 \xB7 \u0647\u0645\u0647\u200C\u06CC \u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638 \u0627\u0633\u062A.")));
}
function App() {
  const [p, setP] = React.useState(null);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "lk-navwrap"
  }, /*#__PURE__*/React.createElement(Navbar, {
    links: D.links,
    ctaLabel: D.cta
  })), /*#__PURE__*/React.createElement("main", null, /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(Work, {
    onOpen: setP
  }), /*#__PURE__*/React.createElement(Services, null), /*#__PURE__*/React.createElement(Process, null), /*#__PURE__*/React.createElement(Results, null), /*#__PURE__*/React.createElement(Quote, null), /*#__PURE__*/React.createElement(Clients, null), /*#__PURE__*/React.createElement(Contact, null)), /*#__PURE__*/React.createElement(Footer, null), /*#__PURE__*/React.createElement(Modal, {
    open: !!p,
    onClose: () => setP(null),
    title: p?.title,
    tags: p?.tags || [],
    art: p?.art,
    sample: true,
    challenge: p?.challenge,
    solution: p?.solution,
    outcome: p?.outcome,
    primaryLabel: D.cta,
    onPrimary: () => {
      setP(null);
      location.hash = "contact";
    }
  }));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/Landing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/data.js
try { (() => {
window.LK_DATA = {
  cta: "درخواست مشاوره رایگان",
  links: [{
    label: "نمونه‌کارها",
    href: "#work"
  }, {
    label: "خدمات",
    href: "#services"
  }, {
    label: "روش کار",
    href: "#process"
  }, {
    label: "مشتریان",
    href: "#clients"
  }],
  filters: ["همه", "وب‌سایت", "فروشگاه", "نرم‌افزار"],
  projects: [{
    id: 1,
    cat: "فروشگاه",
    art: 2,
    tags: ["فروشگاه اینترنتی", "Next.js"],
    title: "فروشگاه آنلاین لوازم خانگی",
    summary: "بازطراحی مسیر خرید و پنل مدیریت سفارش‌ها برای یک فروشگاه چندشعبه.",
    challenge: "مشتریان در مرحله‌ی پرداخت سبد خرید را رها می‌کردند و ثبت سفارش در انبار دستی بود.",
    solution: "مسیر خرید را به سه مرحله کوتاه کردیم و پنل سفارش‌ها را مستقیم به انبار متصل کردیم.",
    outcome: "[نتیجه‌ی واقعی از پنل مدیریت اینجا می‌آید؛ بدون عدد ساختگی.]"
  }, {
    id: 2,
    cat: "نرم‌افزار",
    art: 3,
    tags: ["سامانه‌ی سازمانی", "Laravel"],
    title: "داشبورد مدیریت پروژه",
    summary: "ابزار داخلی برای پیگیری کارها، جلسه‌ها و صورت‌حساب‌ها.",
    challenge: "اطلاعات پروژه‌ها میان چند فایل و گروه پیام‌رسان پراکنده بود.",
    solution: "یک داشبورد واحد با نقش‌های دسترسی و گزارش هفتگی خودکار ساختیم.",
    outcome: "[نتیجه‌ی واقعی از پنل مدیریت اینجا می‌آید.]"
  }, {
    id: 3,
    cat: "وب‌سایت",
    art: 4,
    tags: ["وب‌سایت شرکتی"],
    title: "وب‌سایت شرکت مهندسی",
    summary: "معرفی خدمات و پروژه‌ها با مدیریت محتوای ساده برای تیم فروش.",
    challenge: "سایت قبلی کند بود و تیم فروش نمی‌توانست محتوا را به‌روز کند.",
    solution: "سایتی سبک با پنل محتوای فارسی و صفحه‌های پروژه‌ی قابل‌فیلتر ساختیم.",
    outcome: "[نتیجه‌ی واقعی از پنل مدیریت اینجا می‌آید.]"
  }, {
    id: 4,
    cat: "نرم‌افزار",
    art: 2,
    tags: ["اپلیکیشن وب", "React"],
    title: "سامانه‌ی نوبت‌دهی کلینیک",
    summary: "رزرو آنلاین نوبت، یادآوری پیامکی و تقویم پزشکان.",
    challenge: "نوبت‌ها تلفنی ثبت می‌شد و تداخل زمانی زیاد بود.",
    solution: "تقویم مشترک پزشکان با رزرو آنلاین و یادآوری پیامکی پیاده کردیم.",
    outcome: "[نتیجه‌ی واقعی از پنل مدیریت اینجا می‌آید.]"
  }],
  services: [{
    t: "طراحی و توسعه‌ی وب‌سایت",
    d: "سایت شرکتی سریع و قابل‌مدیریت، از ساختار محتوا تا انتشار.",
    c: ["Next.js", "Tailwind"]
  }, {
    t: "فروشگاه اینترنتی",
    d: "مسیر خرید کوتاه، درگاه پرداخت و پنل سفارش‌ها.",
    c: ["WooCommerce", "Next.js"]
  }, {
    t: "نرم‌افزار اختصاصی",
    d: "سامانه‌های داخلی، داشبورد و اتوماسیون فرایندها.",
    c: ["Laravel", "React"]
  }, {
    t: "پشتیبانی و نگهداری",
    d: "به‌روزرسانی، پایش سرعت و امنیت پس از انتشار.",
    c: ["DevOps"]
  }],
  steps: [{
    t: "گفت‌وگوی اولیه",
    d: "مسئله، مخاطب و محدودیت‌ها را با هم دقیق می‌کنیم."
  }, {
    t: "پیشنهاد و زمان‌بندی",
    d: "دامنه‌ی کار، هزینه و مراحل تحویل را مکتوب می‌دهیم."
  }, {
    t: "طراحی و ساخت",
    d: "در دوره‌های کوتاه می‌سازیم و هر مرحله را با شما مرور می‌کنیم."
  }, {
    t: "انتشار و پشتیبانی",
    d: "سایت را منتشر می‌کنیم و پس از آن کنارتان می‌مانیم."
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Metric = __ds_scope.Metric;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Navbar = __ds_scope.Navbar;

__ds_ns.CoverArt = __ds_scope.CoverArt;

__ds_ns.CropFrame = __ds_scope.CropFrame;

__ds_ns.ProjectCard = __ds_scope.ProjectCard;

__ds_ns.Testimonial = __ds_scope.Testimonial;

})();
