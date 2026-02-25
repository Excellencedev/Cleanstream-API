import { XMLParser } from "fast-xml-parser";
import type { ParsedData } from "./csv.js";

export function parseXML(content: string | Buffer): ParsedData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });

  const parsed = parser.parse(content.toString());

  // Find the array of records (first array found in the structure)
  const records = findRecordsArray(parsed);

  if (!records || records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = Object.keys(records[0]).filter((k) => !k.startsWith("@_"));
  const rows = records.map((record: Record<string, unknown>) => {
    const row: Record<string, string> = {};
    for (const key of headers) {
      const value = record[key];
      row[key] =
        typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
    }
    return row;
  });

  return { headers, rows };
}

function findRecordsArray(obj: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(obj)) {
    return obj as Record<string, unknown>[];
  }

  if (typeof obj === "object" && obj !== null) {
    for (const value of Object.values(obj)) {
      const result = findRecordsArray(value);
      if (result) return result;
    }
  }

  return null;
}
