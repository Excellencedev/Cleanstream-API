import { parse } from "csv-parse/sync";

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCSV(content: string | Buffer): ParsedData {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relaxColumnCount: true,
    relaxQuotes: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = Object.keys(records[0]);
  return { headers, rows: records };
}
