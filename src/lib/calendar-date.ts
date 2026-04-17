/**
 * Local calendar YYYY-MM-DD — do not use toISOString() for "today/tomorrow" comparisons
 * (UTC shift breaks alerts in IST and other non-UTC zones).
 */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ewayCalendarDay(isoOrDay: string | null | undefined): string {
  if (!isoOrDay) return '';
  return String(isoOrDay).split('T')[0];
}

/**
 * Whole calendar days from local today 00:00 to e-way expiry date 00:00.
 * 0 = expires today, 1 = tomorrow, 2 = in 2 days, negative = already past.
 */
export function daysUntilEwayExpiry(ewayDate: string | null | undefined): number | null {
  const day = ewayCalendarDay(ewayDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [ys, ms, ds] = day.split('-').map(Number);
  const expiry = new Date(ys, ms - 1, ds);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / 86400000);
}
