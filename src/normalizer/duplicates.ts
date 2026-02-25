import type { ValidationError } from "../models/schema.js";

export interface DuplicateResult {
  uniqueRecords: Record<string, unknown>[];
  duplicates: ValidationError[];
}

export function detectDuplicates(
  records: Record<string, unknown>[],
  keyFields?: string[],
): DuplicateResult {
  const seen = new Map<string, number>();
  const uniqueRecords: Record<string, unknown>[] = [];
  const duplicates: ValidationError[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Create a fingerprint based on key fields or entire record
    const key = createFingerprint(record, keyFields);

    if (seen.has(key)) {
      const originalRow = seen.get(key)!;
      duplicates.push({
        row: i + 1,
        field: keyFields ? keyFields.join(", ") : "all fields",
        errorType: "duplicate",
        message: `Duplicate of row ${originalRow + 1}`,
        severity: "warning",
      });
    } else {
      seen.set(key, i);
      uniqueRecords.push(record);
    }
  }

  return { uniqueRecords, duplicates };
}

function createFingerprint(
  record: Record<string, unknown>,
  keyFields?: string[],
): string {
  const fields = keyFields ?? Object.keys(record);
  const values = fields.map((f) => {
    const val = record[f];
    return val === null || val === undefined
      ? ""
      : String(val).toLowerCase().trim();
  });
  return values.join("|");
}
