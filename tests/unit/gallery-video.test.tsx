import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GalleryVideo } from "@/components/site/gallery-video";
import { IMAGE_MAX_BYTES, UPLOAD_MAX_REQUEST_BYTES, VIDEO_MAX_BYTES } from "@/lib/media/config";
import { MEDIA_ERRORS } from "@/lib/media/messages";

const f = (path: string) => ({ path, bytes: 10 });
const poster = {
  width: 1280,
  height: 720,
  variants: { fallbackFormat: "jpeg", items: [{ width: 1280, height: 720, avif: f("media/aa/p-1280.avif"), webp: f("media/aa/p-1280.webp"), fallback: f("media/aa/p-1280.jpg") }] },
};
const video = { originalPath: "media/bb/v-video.mp4", mime: "video/mp4", altFa: "نمایی از محیط کار" };
const html = (p: Parameters<typeof GalleryVideo>[0]["poster"]) => renderToStaticMarkup(<GalleryVideo video={video} poster={p} />);

describe("<GalleryVideo />", () => {
  it('never preloads (preload="none"), has a poster, controls, and no autoplay / loop', () => {
    const out = html(poster);
    expect(out).toContain('preload="none"');
    expect(out).toContain('poster="/uploads/media/aa/p-1280.jpg"');
    expect(out).toContain("controls");
    expect(out).not.toMatch(/autoplay|loop|muted/i);
    expect(out).toContain('<source src="/uploads/media/bb/v-video.mp4" type="video/mp4"/>');
  });
  it("reserves space from the poster's size", () => {
    expect(html(poster)).toContain('width="1280"');
    expect(html(poster)).toContain('height="720"');
  });
  it("renders nothing without a poster (the poster is mandatory)", () => {
    expect(html(null)).toBe("");
    expect(html({ ...poster, variants: {} })).toBe("");
    expect(html({ ...poster, width: null })).toBe("");
  });
});

describe("upload limits come from one place", () => {
  it("are 15 MB for images and 25 MB for video", () => {
    expect(IMAGE_MAX_BYTES).toBe(15 * 1024 * 1024);
    expect(VIDEO_MAX_BYTES).toBe(25 * 1024 * 1024);
  });
  it("the request cap and the Persian error text are derived from them", () => {
    expect(UPLOAD_MAX_REQUEST_BYTES).toBe(VIDEO_MAX_BYTES + IMAGE_MAX_BYTES + 1024 * 1024);
    expect(MEDIA_ERRORS.too_large).toContain("۱۵");
    expect(MEDIA_ERRORS.too_large).toContain("۲۵");
    expect(MEDIA_ERRORS.too_large).not.toContain("۱۰۰");
  });
});
