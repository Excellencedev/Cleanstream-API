import * as XLSX from "xlsx";
import type { ParsedData } from "./csv.js";

export function parseExcel(buffer: Buffer): ParsedData {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return { headers: [], rows: [] };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    worksheet,
    {
      defval: "",
      raw: false,
    },
  );

  if (jsonData.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = Object.keys(jsonData[0]);
  const rows = jsonData.map((row) => {
    const stringRow: Record<string, string> = {};
    for (const key of headers) {
      stringRow[key] = String(row[key] ?? "");
    }
    return stringRow;
  });

  return { headers, rows };
}
