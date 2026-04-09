import { FieldType, type FieldDef } from "../models/schema.js";

// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Date patterns to try
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, // ISO: 2024-01-15
  /^\d{4}\/\d{2}\/\d{2}$/, // 2024/01/15
  /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY or DD/MM/YYYY
  /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY or DD-MM-YYYY
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO with time
  /^\w+ \d{1,2}, \d{4}$/, // January 15, 2024
  /^\d{1,2} \w+ \d{4}$/, // 15 January 2024
];

// Boolean values
const TRUE_VALUES = ["true", "yes", "1", "y", "on"];
const FALSE_VALUES = ["false", "no", "0", "n", "off"];

export function detectFieldType(values: string[]): {
  type: FieldType;
  confidence: number;
} {
  const nonEmpty = values.filter((v) => v.trim() !== "");

  if (nonEmpty.length === 0) {
    return { type: FieldType.String, confidence: 0 };
  }

  // Check for email
  const emailMatches = nonEmpty.filter((v) => EMAIL_REGEX.test(v.trim()));
  if (emailMatches.length / nonEmpty.length > 0.8) {
    return {
      type: FieldType.Email,
      confidence: emailMatches.length / nonEmpty.length,
    };
  }

  // Check for phone
  const phoneMatches = nonEmpty.filter((v) => {
    const cleaned = v.replace(/[^\d+]/g, "");
    return cleaned.length >= 10 && cleaned.length <= 15;
  });
  if (phoneMatches.length / nonEmpty.length > 0.8) {
    return {
      type: FieldType.Phone,
      confidence: phoneMatches.length / nonEmpty.length,
    };
  }

  // Check for boolean
  const boolMatches = nonEmpty.filter((v) => {
    const lower = v.toLowerCase().trim();
    return TRUE_VALUES.includes(lower) || FALSE_VALUES.includes(lower);
  });
  if (boolMatches.length / nonEmpty.length > 0.9) {
    return {
      type: FieldType.Boolean,
      confidence: boolMatches.length / nonEmpty.length,
    };
  }

  // Check for date
  const dateMatches = nonEmpty.filter((v) =>
    DATE_PATTERNS.some((pattern) => pattern.test(v.trim())),
  );
  if (dateMatches.length / nonEmpty.length > 0.8) {
    return {
      type: FieldType.Date,
      confidence: dateMatches.length / nonEmpty.length,
    };
  }

  // Check for number
  const numberMatches = nonEmpty.filter((v) => {
    const cleaned = v.replace(/[$€£¥,\s]/g, "").trim();
    return (
      !isNaN(Number(cleaned)) &&
      cleaned !== "" &&
      cleaned.length < 15 &&
      !cleaned.includes("e")
    );
  });
  if (numberMatches.length / nonEmpty.length > 0.8) {
    return {
      type: FieldType.Number,
      confidence: numberMatches.length / nonEmpty.length,
    };
  }

  // Default to string
  return { type: FieldType.String, confidence: 1 };
}

export function inferSchema(
  headers: string[],
  rows: Record<string, string>[],
): FieldDef[] {
  return headers.map((header) => {
    const values = rows.map((row) => row[header] ?? "");
    const { type, confidence } = detectFieldType(values);
    return {
      name: normalizeHeader(header),
      type,
      confidence,
    };
  });
}

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove special chars
    .replace(/\s+/g, "_") // Spaces to underscores
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, ""); // Trim underscores
}
