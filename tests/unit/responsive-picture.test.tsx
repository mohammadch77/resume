import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResponsivePicture, type PictureAsset } from "@/components/site/responsive-picture";

const f = (path: string) => ({ path, bytes: 100 });
const asset: PictureAsset = {
  altFa: "نمای صفحه‌ی اصلی فروشگاه",
  width: 1920,
  height: 1080,
  dominantColor: "#3366aa",
  variants: {
    fallbackFormat: "jpeg",
    items: [
      { width: 480, height: 270, avif: f("media/aa/x-480.avif"), webp: f("media/aa/x-480.webp"), fallback: f("media/aa/x-480.jpg") },
      { width: 1280, height: 720, avif: f("media/aa/x-1280.avif"), webp: f("media/aa/x-1280.webp"), fallback: f("media/aa/x-1280.jpg") },
    ],
  },
};
const html = (props: Partial<Parameters<typeof ResponsivePicture>[0]> = {}) => renderToStaticMarkup(<ResponsivePicture asset={asset} {...props} />);

describe("<ResponsivePicture />", () => {
  it("emits AVIF, then WebP, then the fallback img, with width descriptors", () => {
    const out = html({ sizes: "(min-width: 768px) 420px, 100vw" });
    expect(out.indexOf('type="image/avif"')).toBeGreaterThan(-1);
    expect(out.indexOf('type="image/avif"')).toBeLessThan(out.indexOf('type="image/webp"'));
    expect(out.indexOf('type="image/webp"')).toBeLessThan(out.indexOf("<img"));
    expect(out).toContain('srcSet="/uploads/media/aa/x-480.avif 480w, /uploads/media/aa/x-1280.avif 1280w"');
    expect(out).toContain('src="/uploads/media/aa/x-1280.jpg"');
    expect(out).toContain('sizes="(min-width: 768px) 420px, 100vw"');
  });
  it("sets width and height from the database (no layout shift) and the Persian alt text", () => {
    const out = html();
    expect(out).toContain('width="1920"');
    expect(out).toContain('height="1080"');
    expect(out).toContain('alt="نمای صفحه‌ی اصلی فروشگاه"');
  });
  it("is lazy by default and eager + high priority for the LCP image", () => {
    expect(html()).toContain('loading="lazy"');
    expect(html()).not.toContain("fetchPriority");
    const lcp = html({ priority: true });
    expect(lcp).toContain('loading="eager"');
    expect(lcp).toContain('fetchPriority="high"');
  });
  it("paints the dominant colour placeholder, unless disabled (admin CSP forbids inline styles)", () => {
    expect(html()).toContain("background-color:#3366aa");
    expect(html({ placeholder: false })).not.toContain("style=");
  });
  it("renders nothing for an asset without usable variants or dimensions", () => {
    expect(html({ asset: { ...asset, variants: {} } })).toBe("");
    expect(html({ asset: { ...asset, width: null } })).toBe("");
  });
  it("an explicit alt overrides the stored one", () => {
    expect(html({ alt: "" })).toContain('alt=""');
  });
});
