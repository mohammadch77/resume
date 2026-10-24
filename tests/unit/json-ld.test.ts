import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "@/lib/seo/json-ld";

describe("serializeJsonLd", () => {
  const hostile = {
    "@type": "Organization",
    name: "</script><img src=x onerror=alert(1)>",
    description: "a & b > c \u2028 d \u2029 e <!-- f",
  };

  it("never lets the text close the script element or start markup", () => {
    const out = serializeJsonLd(hostile);
    expect(out).not.toMatch(/[<>&\u2028\u2029]/);
    expect(out.toLowerCase()).not.toContain("</script");
    expect(out).toContain("\\u003c/script\\u003e");
  });

  it("is still the same JSON: parsing it gives the original value back", () => {
    expect(JSON.parse(serializeJsonLd(hostile))).toEqual(hostile);
  });

  it("leaves ordinary Persian and ASCII text unchanged", () => {
    const plain = { name: "گرین وب", url: "https://example.com/a?b=1" };
    expect(serializeJsonLd(plain)).toBe(JSON.stringify(plain));
  });
});
