import { localDateKey } from "./dateTime";

/**
 * expiryDate is a date-only "yyyy-MM-dd" string. Comparing it against "now"
 * as raw Date instants is timezone-fragile: `new Date("yyyy-MM-dd")` parses
 * as UTC midnight, which lands at a different local hour depending on the
 * deployment's UTC offset, shifting the expired/expiring boundary by that
 * offset. Comparing local calendar-day keys instead removes that jitter.
 */
export function isExpired(expiryDate: string | null | undefined): boolean {
  if (!expiryDate) return false;
  return localDateKey(expiryDate) <= localDateKey(new Date());
}

/** True when expiryDate is still in the future but on or before thresholdDate. */
export function isNearExpiry(expiryDate: string | null | undefined, thresholdDate: Date): boolean {
  if (!expiryDate) return false;
  const key = localDateKey(expiryDate);
  return key > localDateKey(new Date()) && key <= localDateKey(thresholdDate);
}

export function threeMonthsFromNow(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d;
}
