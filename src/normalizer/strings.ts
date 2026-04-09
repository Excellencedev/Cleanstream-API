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

export function normalizePhone(value: string): string | null {
  // Remove all non-numeric characters except +
  const cleaned = value.replace(/[^\d+]/g, "");
  // E.164 format: + followed by 10-15 digits
  const e164Regex = /^\+\d{10,15}$/;

  if (e164Regex.test(cleaned)) return cleaned;

  // Handle common US format without +1
  if (cleaned.length === 10 && !cleaned.startsWith("+")) {
    return `+1${cleaned}`;
  }

  return null;
}

export function normalizeName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
