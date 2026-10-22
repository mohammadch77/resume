// Proves the Node runtime has FULL ICU + current tzdata, which Shamsi display (Intl fa-IR-u-ca-persian) needs.
// Self-contained on purpose: it is piped into the final Docker image (`npm run test:icu:docker`).
// Exit code 0 = full ICU; 1 = something is missing (the list is printed).

const failures = [];
const expect = (name, actual, expected) => {
  if (actual !== expected) failures.push(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

const persian = (iso, options) => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", ...options }).format(new Date(iso));
const parts = (iso) => Object.fromEntries(new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone: "UTC", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));

const icuSmall = process.config?.variables?.icu_small;
expect("process.config.variables.icu_small (must not be the small-icu build)", icuSmall === true, false);
if (!process.versions.icu) failures.push("process.versions.icu is missing: Node was built without Intl");
expect("fa-IR locale is supported", Intl.DateTimeFormat.supportedLocalesOf(["fa-IR"]).length, 1);
expect("persian calendar is available", Intl.DateTimeFormat("fa-IR-u-ca-persian").resolvedOptions().calendar, "persian");

// Known pairs (independently verifiable): Nowruz 1403 (leap year), 1404, 1405 and the README example 24 Mehr 1405.
for (const [iso, expected] of [
  ["2024-03-20T12:00:00Z", "1403-1-1"],
  ["2025-03-21T12:00:00Z", "1404-1-1"],
  ["2026-03-21T12:00:00Z", "1405-1-1"],
  ["2026-10-16T12:00:00Z", "1405-7-24"],
  ["2025-03-20T12:00:00Z", "1403-12-30"],
]) {
  const p = parts(iso);
  expect(`Gregorian ${iso} -> Persian`, `${p.relatedYear ?? p.year}-${p.month}-${p.day}`, expected);
}

// Persian digits and month names in Persian (this is what visitors see).
expect("Persian digits", persian("2026-10-16T12:00:00Z", { year: "numeric", month: "numeric", day: "numeric" }), "۱۴۰۵/۷/۲۴");
expect("Persian month name", persian("2026-10-16T12:00:00Z", { month: "long" }), "مهر");
expect("Persian weekday name", persian("2026-10-16T12:00:00Z", { weekday: "long" }), "جمعه");

// Time zone data must be recent: Iran abolished DST in 2022, so Tehran is UTC+03:30 all year.
const tehranHour = (iso) => new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
expect("Asia/Tehran in July 2026 (no DST => 03:30)", tehranHour("2026-07-01T00:00:00Z"), "03:30");
expect("Asia/Tehran in January 2026", tehranHour("2026-01-01T00:00:00Z"), "03:30");

const report = { node: process.version, icu: process.versions.icu, tz: process.versions.tz, cldr: process.versions.cldr, icu_small: icuSmall, failures };
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
