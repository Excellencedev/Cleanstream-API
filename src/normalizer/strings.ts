const TRUE_VALUES = ["true", "yes", "1", "y", "on"];
const FALSE_VALUES = ["false", "no", "0", "n", "off"];

export function normalizeString(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ") // Collapse whitespace
    .replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters
}

export function normalizeEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : null;
}

export function normalizeBoolean(value: string): boolean | null {
  const lower = value.toLowerCase().trim();
  if (TRUE_VALUES.includes(lower)) return true;
  if (FALSE_VALUES.includes(lower)) return false;
  return null;
}
