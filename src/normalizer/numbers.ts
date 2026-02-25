export function normalizeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Remove currency symbols and thousand separators
  let cleaned = trimmed
    .replace(/[$€£¥₹]/g, "") // Currency symbols
    .replace(/\s/g, "") // Spaces
    .trim();

  // Handle European format (1.234,56 -> 1234.56)
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // Handle US format (1,234.56 -> 1234.56)
    cleaned = cleaned.replace(/,/g, "");
  }

  // Handle percentage
  const isPercentage = cleaned.endsWith("%");
  if (isPercentage) {
    cleaned = cleaned.slice(0, -1);
  }

  const num = Number(cleaned);
  if (isNaN(num)) return null;

  return isPercentage ? num / 100 : num;
}
