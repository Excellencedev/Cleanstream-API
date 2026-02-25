import {
  FieldType,
  type FieldDef,
  type ValidationError,
} from "../models/schema.js";
import { normalizeDate } from "./dates.js";
import { normalizeNumber } from "./numbers.js";
import {
  normalizeString,
  normalizeEmail,
  normalizeBoolean,
} from "./strings.js";

export { normalizeDate } from "./dates.js";
export { normalizeNumber } from "./numbers.js";
export {
  normalizeString,
  normalizeEmail,
  normalizeBoolean,
} from "./strings.js";
export { detectDuplicates } from "./duplicates.js";

export interface NormalizationResult {
  records: Record<string, unknown>[];
  errors: ValidationError[];
}

export function normalizeRecords(
  rows: Record<string, string>[],
  schema: FieldDef[],
  originalHeaders: string[],
): NormalizationResult {
  const errors: ValidationError[] = [];
  const records: Record<string, unknown>[] = [];

  // Create header mapping (original -> normalized)
  const headerMap = new Map<string, FieldDef>();
  for (let i = 0; i < originalHeaders.length; i++) {
    headerMap.set(originalHeaders[i], schema[i]);
  }

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const record: Record<string, unknown> = {};

    for (const [originalHeader, value] of Object.entries(row)) {
      const fieldDef = headerMap.get(originalHeader);
      if (!fieldDef) continue;

      const normalizedValue = normalizeValue(value, fieldDef.type);

      if (normalizedValue === null && value.trim() !== "") {
        errors.push({
          row: rowIdx + 1,
          field: fieldDef.name,
          errorType: "type_mismatch",
          message: `Cannot convert "${value}" to ${fieldDef.type}`,
          severity: "warning",
        });
        record[fieldDef.name] = value; // Keep original on failure
      } else {
        record[fieldDef.name] =
          normalizedValue ?? (value.trim() === "" ? null : value);
      }
    }

    records.push(record);
  }

  return { records, errors };
}

function normalizeValue(value: string, type: FieldType): unknown {
  switch (type) {
    case FieldType.String:
      return normalizeString(value);
    case FieldType.Email:
      return normalizeEmail(value);
    case FieldType.Number:
      return normalizeNumber(value);
    case FieldType.Date:
      return normalizeDate(value);
    case FieldType.Boolean:
      return normalizeBoolean(value);
    default:
      return normalizeString(value);
  }
}
