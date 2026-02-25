import type { ParsedData } from "./csv.js";

export function parseJSON(content: string | Buffer): ParsedData {
  const parsed = JSON.parse(content.toString());

  // Handle different JSON structures
  let records: Record<string, unknown>[];

  if (Array.isArray(parsed)) {
    records = parsed;
  } else if (parsed.data && Array.isArray(parsed.data)) {
    records = parsed.data;
  } else if (parsed.records && Array.isArray(parsed.records)) {
    records = parsed.records;
  } else {
    // Single object - wrap in array
    records = [parsed];
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  // Collect all unique headers from all records
  const headerSet = new Set<string>();
  for (const record of records) {
    Object.keys(record).forEach((k) => headerSet.add(k));
  }
  const headers = Array.from(headerSet);

  const rows = records.map((record) => {
    const row: Record<string, string> = {};
    for (const key of headers) {
      const value = record[key];
      if (value === undefined || value === null) {
        row[key] = "";
      } else if (typeof value === "object") {
        row[key] = JSON.stringify(value);
      } else {
        row[key] = String(value);
      }
    }
    return row;
  });

  return { headers, rows };
}
