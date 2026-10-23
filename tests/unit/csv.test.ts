import { describe, expect, it } from "vitest";
import { CSV_BOM, csvField, neutralizeFormula, toCsv } from "@/lib/admin/csv";

describe("neutralizeFormula", () => {
  it.each(["=1+1", "+98912", "-2+3", "@SUM(A1)", "|calc!A1", "=HYPERLINK(\"http://evil\")", "\t=1", "\r=1"])("prefixes %j", (cell) => {
    expect(neutralizeFormula(cell)).toBe(`'${cell}`);
  });

  it.each([" =1+1", "‏=1+1", "‮+9", " @x", "﻿-1", "​‏ =cmd"])("sees through invisible leading characters: %j", (cell) => {
    expect(neutralizeFormula(cell).startsWith("'")).toBe(true);
  });

  it.each(["سلام", "09121234567", "a=b", "x+y", "ali@example.com", "", "1404/05/12", "شرکت - نمونه"])("leaves %j alone", (cell) => {
    expect(neutralizeFormula(cell)).toBe(cell);
  });
});

describe("csvField / toCsv", () => {
  it("always quotes, doubles quotes and keeps line breaks inside the quotes", () => {
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField("خط اول\nخط دوم")).toBe('"خط اول\nخط دوم"');
    expect(csvField(null)).toBe('""');
  });

  it("neutralises a formula that is hidden behind a quote character", () => {
    expect(csvField('=cmd|" /C calc"!A0')).toBe(`"'=cmd|"" /C calc""!A0"`);
  });

  it("starts with the BOM, uses CRLF and ends with a line break", () => {
    const csv = toCsv(["نام", "تلفن"], [["علی", "0912"], ["=EVIL()", null]]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toBe(`${CSV_BOM}"نام","تلفن"\r\n"علی","0912"\r\n"'=EVIL()",""\r\n`);
    expect(csv.split("\r\n")).toHaveLength(4); // header, two rows, trailing empty
  });
});
