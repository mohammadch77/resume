import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as ds from "@/components/ds";
import { Button, Chip, Field, Icon, ICON_NAMES, Metric, Modal, ProjectCard } from "@/components/ds";
import { devPagesEnabled } from "@/lib/dev-pages";
import { SERVICE_ICONS } from "@/lib/validation/common";
import { buildThemeCss, buildTokensCss } from "../../scripts/gen-tokens";
import { findViolations } from "../../scripts/tokens-check";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8").replaceAll("\r\n", "\n");

describe("generated token files", () => {
  it("app/tokens.css and app/theme.css match design/ exactly (run `npm run tokens:gen` after changing design/)", () => {
    expect(read("app/tokens.css")).toBe(buildTokensCss());
    expect(read("app/theme.css")).toBe(buildThemeCss());
  });

  it("the theme maps every design colour and type size to a Tailwind utility", () => {
    const theme = buildThemeCss();
    for (const token of ["--color-paper", "--color-lapis", "--color-saffron-text", "--font-display", "--text-display-xl", "--text-display-xl--line-height", "--text-body", "--radius-pill", "--ease-out", "--spacing: 4px"]) {
      expect(theme, token).toContain(token);
    }
  });

  it("the font faces point at /fonts and the base element rules sit in a layer", () => {
    const css = buildTokensCss();
    expect(css).toContain('url("/fonts/Estedad-ExtraBold.woff2")');
    expect(css).not.toContain("../fonts/");
    expect(css).toMatch(/@layer base \{[\s\S]*html\{background/);
  });
});

describe("tokens:check", () => {
  it("passes on this repository: no raw colours or px values in app/ and components/", () => {
    expect(findViolations()).toEqual([]);
  });

  it("finds raw colours and px values, but not breakpoints, comments or generated files", () => {
    const root = mkdtempSync(path.join(tmpdir(), "gw-tokens-"));
    try {
      mkdirSync(path.join(root, "app"), { recursive: true });
      mkdirSync(path.join(root, "components", "ui"), { recursive: true });
      writeFileSync(path.join(root, "app", "bad.tsx"), 'const a = "#2338d6";\nconst b = { padding: "13px" };\nconst c = "rgb(1, 2, 3)";\n');
      writeFileSync(path.join(root, "app", "ok.tsx"), '// a 16px comment and #fff in prose\nconst sizes = "(min-width: 1280px) 20vw, 100vw";\nconst gap = "var(--space-4)";\n');
      writeFileSync(path.join(root, "app", "tokens.css"), ":root{--x:#ffffff;--y:4px}");
      writeFileSync(path.join(root, "components", "ui", "vendor.tsx"), 'const r = "rounded-[4px]";');
      const found = findViolations(root);
      expect(found.map((v) => `${v.file}:${v.line}:${v.rule}`).sort()).toEqual(["app/bad.tsx:1:raw hex colour", "app/bad.tsx:2:raw px value", "app/bad.tsx:3:raw rgb()/hsl()/oklch() colour"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("dev pages gate", () => {
  it("exist in development and test, never in production unless a test run asks for them", () => {
    expect(devPagesEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(devPagesEnabled({ NODE_ENV: "test" })).toBe(true);
    expect(devPagesEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(devPagesEnabled({ NODE_ENV: "production", ENABLE_DEV_PAGES: "false" })).toBe(false);
    expect(devPagesEnabled({ NODE_ENV: "production", ENABLE_DEV_PAGES: "true" })).toBe(true);
  });
});

describe("design-system components", () => {
  it("the barrel exports the eleven components of the export and the four we added (CtaBand, Dialog, ServiceCard, ServiceGrid)", () => {
    expect(Object.keys(ds).filter((k) => /^[A-Z][a-z]/.test(k)).sort()).toEqual(["Button", "Chip", "CoverArt", "CropFrame", "CtaBand", "Dialog", "Field", "Icon", "Metric", "Modal", "Navbar", "ProjectCard", "ServiceCard", "ServiceGrid", "Testimonial"]);
  });

  it("every icon the service form offers exists in the icon map", () => {
    for (const icon of SERVICE_ICONS) expect(ICON_NAMES, icon).toContain(icon);
  });

  it("Button renders the design markup: gw-btn classes, <a> with href, icon-only needs a label", () => {
    expect(renderToStaticMarkup(<Button>درخواست مشاوره رایگان</Button>)).toBe('<button type="button" class="gw-btn gw-btn--primary">درخواست مشاوره رایگان</button>');
    const link = renderToStaticMarkup(
      <Button variant="secondary" size="sm" href="#work">
        نمونه‌کارها
      </Button>,
    );
    expect(link).toContain('<a class="gw-btn gw-btn--secondary gw-btn--sm" href="#work">');
    const icon = renderToStaticMarkup(<Button variant="quiet" iconOnly="x" label="بستن" />);
    expect(icon).toContain("gw-btn--icon");
    expect(icon).toContain('aria-label="بستن"');
    expect(renderToStaticMarkup(<Button disabled href="#x">غیرفعال</Button>)).toContain('aria-disabled="true"');
  });

  it("Icon is decorative (aria-hidden) unless it has a label, and draws a 1.5px Lucide stroke", () => {
    const decorative = renderToStaticMarkup(<Icon name="check" />);
    expect(decorative).toContain('aria-hidden="true"');
    expect(decorative).toContain('stroke-width="1.5"');
    const labelled = renderToStaticMarkup(<Icon name="circle-alert" size={16} label="خطا" />);
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain('aria-label="خطا"');
    expect(labelled).toContain("--gw-icon-size:16px");
  });

  it("Chip filter is a toggle button with aria-pressed and a check when selected; status chips get their icon", () => {
    const on = renderToStaticMarkup(<Chip variant="filter" selected>همه</Chip>);
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain("lucide-check");
    expect(renderToStaticMarkup(<Chip variant="filter">وب‌سایت</Chip>)).toContain('aria-pressed="false"');
    expect(renderToStaticMarkup(<Chip variant="success">منتشر شده</Chip>)).toContain("lucide-circle-check");
    expect(renderToStaticMarkup(<Chip>تگ</Chip>)).not.toContain("<svg");
  });

  it("Field wires label, hint and error to the control for assistive technology", () => {
    const html = renderToStaticMarkup(<Field id="f1" label="ایمیل" hint="راهنما" error="یک ایمیل کامل بنویسید" optional />);
    expect(html).toContain('<label class="gw-field__label" for="f1">');
    expect(html).toContain("(اختیاری)");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="f1-err f1-hint"');
    expect(html).toContain("is-invalid");
    expect(renderToStaticMarkup(<Field id="f2" label="پیام" multiline />)).toContain("<textarea");
  });

  it("Metric hides the source line when there is neither a source nor the sample badge", () => {
    expect(renderToStaticMarkup(<Metric value="۴۰٪" label="کاهش زمان" />)).not.toContain("gw-metric__source");
    expect(renderToStaticMarkup(<Metric value="۴۰٪" label="کاهش زمان" source="پروژه‌ی [نام]" sample />)).toContain('<span class="gw-sample">نمونه</span>');
  });

  it("ProjectCard shows at most four tags and a sample cover by default", () => {
    const html = renderToStaticMarkup(<ProjectCard title="پروژه" tags={["الف", "ب", "ج", "د", "ه"]} />);
    expect(html.match(/gw-chip gw-chip--tag/g)).toHaveLength(4);
    expect(html).toContain("gw-crop-frame");
    expect(html).toContain("نمونه");
  });

  it("Modal renders nothing when closed and a labelled dialog when open", () => {
    const props = { title: "عنوان", challenge: "چالش", solution: "راه‌حل", outcome: "نتیجه" };
    expect(renderToStaticMarkup(<Modal {...props} open={false} />)).toBe("");
    const html = renderToStaticMarkup(<Modal {...props} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toMatch(/aria-labelledby="([^"]+)"[\s\S]*<h2 class="gw-modal__title" id="\1"/);
    expect(html).toContain("درخواست مشاوره رایگان");
  });
});
