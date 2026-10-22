import { describe, expect, it } from "vitest";
import {
  gregorianToJalali,
  isValidJalali,
  isoDateToJalali,
  jalaliMonthLength,
  jalaliToGregorian,
  jalaliToIsoDate,
} from "@/lib/date/jalali";

/** ICU's own Persian calendar is the oracle: it is what `Intl.DateTimeFormat('fa-IR-u-ca-persian')` shows visitors. */
const oracle = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" });
function icuJalali(date: Date): { jy: number; jm: number; jd: number } {
  const parts = Object.fromEntries(oracle.formatToParts(date).map((p) => [p.type, p.value]));
  return { jy: Number(parts.relatedYear ?? parts.year), jm: Number(parts.month), jd: Number(parts.day) };
}

describe("Shamsi <-> Gregorian", () => {
  it("knows the Nowruz anchors", () => {
    expect(gregorianToJalali(2024, 3, 20)).toEqual({ jy: 1403, jm: 1, jd: 1 });
    expect(gregorianToJalali(2025, 3, 21)).toEqual({ jy: 1404, jm: 1, jd: 1 });
    expect(gregorianToJalali(2026, 3, 21)).toEqual({ jy: 1405, jm: 1, jd: 1 });
    expect(jalaliToGregorian({ jy: 1405, jm: 7, jd: 24 })).toEqual({ gy: 2026, gm: 10, gd: 16 });
    expect(jalaliToIsoDate({ jy: 1405, jm: 7, jd: 24 })).toBe("2026-10-16");
  });

  it("matches ICU for every single day from 1300 to 1500 AH, and round-trips", () => {
    // 1300-01-01 = 1921-03-21 ; 1500-12-29 = 2122-03-20
    const start = Date.UTC(1921, 2, 21);
    const end = Date.UTC(2122, 2, 21);
    let checked = 0;
    for (let t = start; t < end; t += 86_400_000) {
      const d = new Date(t);
      const icu = icuJalali(d);
      const mine = gregorianToJalali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      if (mine.jy !== icu.jy || mine.jm !== icu.jm || mine.jd !== icu.jd) {
        throw new Error(`${d.toISOString().slice(0, 10)}: mine ${JSON.stringify(mine)} vs ICU ${JSON.stringify(icu)}`);
      }
      const back = jalaliToGregorian(mine);
      if (back.gy !== d.getUTCFullYear() || back.gm !== d.getUTCMonth() + 1 || back.gd !== d.getUTCDate()) {
        throw new Error(`round trip failed for ${d.toISOString().slice(0, 10)}`);
      }
      checked += 1;
    }
    expect(checked).toBeGreaterThan(73_000);
  });

  it("month lengths and leap years: 31 x6, 30 x5, Esfand 29 (30 in leap years such as 1403)", () => {
    expect([1, 6, 7, 11, 12].map((m) => jalaliMonthLength(1404, m))).toEqual([31, 31, 30, 30, 29]);
    expect(jalaliMonthLength(1403, 12)).toBe(30);
  });

  it("validates dates", () => {
    expect(isValidJalali({ jy: 1405, jm: 12, jd: 29 })).toBe(true);
    expect(isValidJalali({ jy: 1405, jm: 12, jd: 30 })).toBe(false);
    expect(isValidJalali({ jy: 1403, jm: 12, jd: 30 })).toBe(true);
    expect(isValidJalali({ jy: 1405, jm: 7, jd: 31 })).toBe(false);
    expect(isValidJalali({ jy: 1405, jm: 13, jd: 1 })).toBe(false);
    expect(isValidJalali({ jy: 1405, jm: 0, jd: 1 })).toBe(false);
    expect(isValidJalali({ jy: 1405.5, jm: 1, jd: 1 })).toBe(false);
    expect(() => jalaliToGregorian({ jy: 1405, jm: 12, jd: 30 })).toThrow(RangeError);
  });

  it("parses ISO dates", () => {
    expect(isoDateToJalali("2026-10-16")).toEqual({ jy: 1405, jm: 7, jd: 24 });
    expect(isoDateToJalali("16/10/2026")).toBeNull();
    expect(isoDateToJalali("")).toBeNull();
  });
});
