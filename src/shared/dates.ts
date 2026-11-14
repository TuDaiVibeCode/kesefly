const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a calendar date (`YYYY-MM-DD`) as local midnight instead of UTC.
 * `new Date('2026-11-01')` is UTC and can render as the previous day in
 * negative timezones; the app stores local calendar dates for comparisons.
 */
export function parseDateOnly(value: string): Date | null {
  const match = dateOnlyPattern.exec(value);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const roundTrip = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return roundTrip ? date : null;
}

export function formatCalendarDate(value: string): string {
  const date = parseDateOnly(value);
  return date ? date.toLocaleDateString('vi-VN') : value;
}
