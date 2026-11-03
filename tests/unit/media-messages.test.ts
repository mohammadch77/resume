import { describe, expect, it } from "vitest";
import { MEDIA_ERRORS, codeFromHttpFailure } from "@/lib/media/messages";

describe("codeFromHttpFailure (answers that are not our JSON, e.g. a proxy error page)", () => {
  it.each([
    [0, "network_error"],
    [413, "proxy_too_large"],
    [401, "unauthenticated"],
    [403, "bad_origin"],
    [500, "server_error"],
    [502, "server_error"],
  ] as const)("status %i reads as %s", (status, code) => {
    expect(codeFromHttpFailure(status)).toBe(code);
  });

  it("every returned code has a Persian message", () => {
    for (const status of [0, 401, 403, 413, 500]) {
      expect(MEDIA_ERRORS[codeFromHttpFailure(status)]).toMatch(/[؀-ۿ]/);
    }
  });
});
