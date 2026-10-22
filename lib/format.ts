const dateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});

/** Gregorian instants are stored; Shamsi is only a display concern. */
export function formatDateTime(value: Date): string {
  return dateTime.format(value);
}

export function formatNumber(value: number): string {
  return value.toLocaleString("fa-IR");
}
