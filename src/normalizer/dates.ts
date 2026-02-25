import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(customParseFormat);

const DATE_FORMATS = [
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "MM-DD-YYYY",
  "DD-MM-YYYY",
  "YYYY-MM-DDTHH:mm:ss",
  "YYYY-MM-DDTHH:mm:ssZ",
  "MMMM D, YYYY",
  "D MMMM YYYY",
  "MMM D, YYYY",
  "D MMM YYYY",
];

export function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  for (const format of DATE_FORMATS) {
    const parsed = dayjs(trimmed, format, true);
    if (parsed.isValid()) {
      return parsed.format("YYYY-MM-DD");
    }
  }

  // Try native Date parsing as fallback
  const nativeDate = new Date(trimmed);
  if (!isNaN(nativeDate.getTime())) {
    return dayjs(nativeDate).format("YYYY-MM-DD");
  }

  return null;
}
