import { describe, expect, it } from "vitest";
import { buildAdminCsp, buildLandingCsp } from "@/lib/security/csp";

describe("admin CSP", () => {
  const csp = buildAdminCsp("abc123", false);
  it("uses the nonce with strict-dynamic and never unsafe-inline / unsafe-eval in production", () => {
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'nonce-abc123'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("unsafe-eval");
  });
  it("locks down objects, base, forms and framing, and has no external origins", () => {
    for (const d of ["object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) expect(csp).toContain(d);
    expect(csp).not.toMatch(/https?:\/\//);
  });
  it("allows eval only in development", () => {
    expect(buildAdminCsp("n", true)).toContain("'unsafe-eval'");
  });
});

describe("landing CSP", () => {
  const csp = buildLandingCsp(false);
  it("limits scripts to our own origin; inline is allowed only because the page is static (no nonce possible)", () => {
    expect(csp).toContain("script-src 'self' 'unsafe-inline';");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/https?:\/\//);
  });
  it("still blocks objects, framing, foreign base/forms", () => {
    for (const d of ["object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) expect(csp).toContain(d);
  });
});
