import { isoDateToJalali, isValidJalali, jalaliToIsoDate } from "./jalali";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Persian / Arabic-Indic digits to ASCII, so text typed on a Persian keyboard parses. */
export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (d) => String(Math.max(PERSIAN_DIGITS.indexOf(d), ARABIC_DIGITS.indexOf(d))));
}

/** "1404/05/12" (Persian digits and `-` accepted) to the ISO Gregorian date Postgres stores, or null when invalid. */
export function parseJalaliInput(value: string): string | null {
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(normalizeDigits(value.trim()));
  if (!m) return null;
  const date = { jy: Number(m[1]), jm: Number(m[2]), jd: Number(m[3]) };
  return isValidJalali(date) ? jalaliToIsoDate(date) : null;
}

/** ISO Gregorian date to the "1404/05/12" form the editor types; "" for no date. */
export function formatJalaliInput(iso: string | null): string {
  const j = iso ? isoDateToJalali(iso) : null;
  return j ? `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}` : "";
}
