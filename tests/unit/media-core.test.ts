import { describe, expect, it } from "vitest";
import { variantWidths } from "@/lib/media/encode";
import { newMediaBase, resolveUploadPath } from "@/lib/media/paths";
import { sniffMime } from "@/lib/media/sniff";
import { assetFilePaths, parseVariants } from "@/lib/media/variants";
import { fakeExe, fakeMatroska, fakeMp4, fakeWebm, html, makePhoto, svg } from "../support/media-fixtures";

describe("sniffMime (magic bytes, never the file name)", () => {
  it.each([
    ["image/jpeg", "jpeg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/avif", "avif"],
  ] as const)("recognises %s", async (mime, format) => {
    expect(sniffMime(await makePhoto(32, 32, { format }))).toBe(mime);
  });
  it("recognises mp4 and webm containers", () => {
    expect(sniffMime(fakeMp4())).toBe("video/mp4");
    expect(sniffMime(fakeWebm())).toBe("video/webm");
  });
  it.each([
    ["a Windows executable (renamed .jpg)", fakeExe()],
    ["an SVG with an embedded script", svg()],
    ["HTML", html()],
    ["a PHP script", Buffer.from("<?php system($_GET['c']); ?>        ")],
    ["a GIF", Buffer.from("GIF89a" + "x".repeat(40))],
    ["a PDF", Buffer.from("%PDF-1.7\n" + "x".repeat(40))],
    ["an empty file", Buffer.alloc(0)],
    ["a truncated header", Buffer.from([0xff, 0xd8, 0xff])],
    ["a Matroska video (not WebM)", fakeMatroska()],
    ["a HEIC image (ftyp with another brand)", Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic"), Buffer.alloc(40)])],
    ["a RIFF/WAVE audio file", Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WAVEfmt "), Buffer.alloc(20)])],
  ])("rejects %s", (_name, bytes) => {
    expect(sniffMime(bytes)).toBeNull();
  });
});

describe("variantWidths: never upscale", () => {
  it.each([
    [100, [100]],
    [300, [300]],
    [480, [480]],
    [481, [480, 481]],
    [1000, [480, 768, 1000]],
    [1920, [480, 768, 1280, 1920]],
    [3000, [480, 768, 1280, 1920]],
  ])("source %i px -> %j", (source, expected) => {
    expect(variantWidths(source)).toEqual(expected);
    expect(Math.max(...variantWidths(source))).toBeLessThanOrEqual(Math.max(source, 0));
  });
});

describe("resolveUploadPath", () => {
  const root = process.platform === "win32" ? "C:\\data\\uploads" : "/data/uploads";
  it("accepts plain names", () => {
    const p = resolveUploadPath(root, ["media", "3f", "3fa9c0de-480.avif"]);
    expect(p).not.toBeNull();
    expect(p!.startsWith(root)).toBe(true);
  });
  it.each([
    [[]],
    [[".."]],
    [["."]],
    [["media", "..", "..", "secret"]],
    [["%2e%2e", "secret"]],
    [["a/b"]],
    [["a\\b"]],
    [["/etc/passwd"]],
    [["C:", "Windows"]],
    [[".env"]],
    [["a\0b"]],
    [["media", ""]],
    [["a..b"]],
    [["a b"]],
  ])("refuses %j", (segments) => {
    expect(resolveUploadPath(root, segments)).toBeNull();
  });
});

describe("storage names", () => {
  it("are random, sharded, and never derived from the uploaded file name", () => {
    const a = newMediaBase();
    expect(a).toMatch(/^media\/[0-9a-f]{2}\/[0-9a-f]{32}$/);
    expect(a.split("/")[1]).toBe(a.split("/")[2].slice(0, 2));
    expect(newMediaBase()).not.toBe(a);
  });
});

describe("variants metadata", () => {
  const good = {
    fallbackFormat: "jpeg",
    items: [{ width: 480, height: 320, avif: { path: "media/aa/x-480.avif", bytes: 10 }, webp: { path: "media/aa/x-480.webp", bytes: 11 }, fallback: { path: "media/aa/x-480.jpg", bytes: 12 } }],
  };
  it("parses the stored shape and rejects anything else", () => {
    expect(parseVariants(good)).not.toBeNull();
    expect(parseVariants({})).toBeNull();
    expect(parseVariants(null)).toBeNull();
    expect(parseVariants({ ...good, items: [] })).toBeNull();
  });
  it("lists every file of an asset for deletion", () => {
    expect(assetFilePaths({ originalPath: "media/aa/x-original.jpg", variants: good })).toEqual([
      "media/aa/x-original.jpg",
      "media/aa/x-480.avif",
      "media/aa/x-480.webp",
      "media/aa/x-480.jpg",
    ]);
    expect(assetFilePaths({ originalPath: "media/aa/v-video.mp4", variants: {} })).toEqual(["media/aa/v-video.mp4"]);
  });
});
