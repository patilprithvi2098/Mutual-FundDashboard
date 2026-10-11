export const iso = (d: Date) => d.toISOString().slice(0, 10);

export function parseDMY(s: string) {
  const [d, m, y] = s.split("-");
  return `${y}-${m}-${d}`;
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}
export function addMonths(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  return iso(d);
}
export function todayIST() {
  return iso(new Date(Date.now() + 5.5 * 3600e3));
}
/** Saturday on or after the given date: the label of the weekly report. */
export function weekEnding(date: string) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  return iso(d);
}
