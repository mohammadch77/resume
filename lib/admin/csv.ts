/** UTF-8 byte order mark: without it Excel opens a UTF-8 CSV as ANSI and Persian text turns into garbage. */
export const CSV_BOM = "﻿";

/**
 * Characters that may precede a formula without stopping a spreadsheet from evaluating it: whitespace, zero-width
 * and bidi marks (visitors type in RTL, so these are realistic), and the BOM.
 */
const INVISIBLE = "\\s\\u00A0\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF";
const FORMULA_START = new RegExp(`^[${INVISIBLE}]*[=+\\-@|]`);

/**
 * Formula injection defence (OWASP "CSV injection"). A cell that a spreadsheet could read as a formula (`=`, `+`,
 * `-`, `@`, or the DDE pipe `|`, even after invisible characters) gets a leading apostrophe, which spreadsheets show
 * as plain text. Tab and carriage return at the start are also formula carriers in some programs.
 */
export function neutralizeFormula(value: string): string {
  return FORMULA_START.test(value) || /^[\t\r]/.test(value) ? `'${value}` : value;
}

/** One CSV field: neutralised, always quoted, quotes doubled. Line breaks inside a field are kept (inside quotes). */
export function csvField(value: string | null | undefined): string {
  return `"${neutralizeFormula(value ?? "").replaceAll('"', '""')}"`;
}

/** CSV text with BOM and CRLF line endings (RFC 4180, and what Excel expects). */
export function toCsv(header: string[], rows: Array<Array<string | null | undefined>>): string {
  const lines = [header, ...rows].map((row) => row.map(csvField).join(","));
  return `${CSV_BOM}${lines.join("\r\n")}\r\n`;
}
