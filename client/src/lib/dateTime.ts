import { format } from "date-fns";

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseServerDate(value: string | Date | null | undefined): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;

  const input = String(value).trim();
  if (!input) return new Date(0);

  if (YMD_PATTERN.test(input)) {
    return new Date(`${input}T00:00:00`);
  }

  if (input.endsWith("Z")) {
    const localParsed = new Date(input.slice(0, -1));
    if (!Number.isNaN(localParsed.getTime())) {
      return localParsed;
    }
  }

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(0);
}

export function localDateKey(value: string | Date | null | undefined): string {
  return format(parseServerDate(value), "yyyy-MM-dd");
}

export function startOfLocalDay(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00`);
}

export function endOfLocalDay(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T23:59:59.999`);
}

export function formatAppDate(value: string | Date | null | undefined, dateFormat = "dd MMM yyyy"): string {
  return format(parseServerDate(value), dateFormat);
}

export function formatAppDateTime(
  value: string | Date | null | undefined,
  dateFormat = "dd MMM yyyy, hh:mm a",
): string {
  return format(parseServerDate(value), dateFormat);
}
