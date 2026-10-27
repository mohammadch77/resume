import { describe, expect, it } from "vitest";
import { CONTACT_HREF, resolveConsultHref } from "@/lib/site/links";
import { lockScroll, onScrollLock } from "@/lib/motion/scroll-lock";

describe("resolveConsultHref", () => {
  it("empty, missing or the old #contact anchor mean the contact form", () => {
    expect(resolveConsultHref(null)).toBe(CONTACT_HREF);
    expect(resolveConsultHref(undefined)).toBe(CONTACT_HREF);
    expect(resolveConsultHref("")).toBe(CONTACT_HREF);
    expect(resolveConsultHref("#contact")).toBe(CONTACT_HREF);
  });
  it("tel:, https:// and other anchors are kept", () => {
    expect(resolveConsultHref("tel:+989121234567")).toBe("tel:+989121234567");
    expect(resolveConsultHref("https://example.com/x")).toBe("https://example.com/x");
    expect(resolveConsultHref("#work")).toBe("#work");
  });
});

describe("lockScroll is counted", () => {
  it("stays locked until the last dialog releases it; releasing twice does nothing", () => {
    const seen: boolean[] = [];
    const off = onScrollLock((locked) => seen.push(locked));
    const a = lockScroll();
    const b = lockScroll();
    a();
    a();
    expect(seen.at(-1)).toBe(true);
    b();
    expect(seen.at(-1)).toBe(false);
    off();
  });
});
