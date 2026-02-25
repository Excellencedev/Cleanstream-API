import { describe, expect, test } from "bun:test";
import { normalizeDate } from "../src/normalizer/dates";
import { normalizeNumber } from "../src/normalizer/numbers";
import {
  normalizeString,
  normalizeEmail,
  normalizeBoolean,
} from "../src/normalizer/strings";
import { detectDuplicates } from "../src/normalizer/duplicates";

describe("Date Normalization", () => {
  test("normalizes ISO format", () => {
    expect(normalizeDate("2024-01-15")).toBe("2024-01-15");
  });

  test("normalizes US format MM/DD/YYYY", () => {
    expect(normalizeDate("01/15/2024")).toBe("2024-01-15");
  });

  test("normalizes slash format YYYY/MM/DD", () => {
    expect(normalizeDate("2024/01/15")).toBe("2024-01-15");
  });

  test("returns null for invalid date", () => {
    expect(normalizeDate("not a date")).toBeNull();
  });
});

describe("Number Normalization", () => {
  test("handles plain numbers", () => {
    expect(normalizeNumber("123")).toBe(123);
    expect(normalizeNumber("123.45")).toBe(123.45);
  });

  test("strips currency symbols", () => {
    expect(normalizeNumber("$123.45")).toBe(123.45);
    expect(normalizeNumber("€99.99")).toBe(99.99);
    expect(normalizeNumber("£50")).toBe(50);
  });

  test("handles US format with commas", () => {
    expect(normalizeNumber("1,234.56")).toBe(1234.56);
    expect(normalizeNumber("$1,234,567.89")).toBe(1234567.89);
  });

  test("handles European format", () => {
    expect(normalizeNumber("1.234,56")).toBe(1234.56);
  });

  test("handles percentages", () => {
    expect(normalizeNumber("50%")).toBe(0.5);
    expect(normalizeNumber("12.5%")).toBe(0.125);
  });
});

describe("String Normalization", () => {
  test("trims whitespace", () => {
    expect(normalizeString("  hello  ")).toBe("hello");
  });

  test("collapses multiple spaces", () => {
    expect(normalizeString("hello    world")).toBe("hello world");
  });
});

describe("Email Normalization", () => {
  test("lowercases and trims", () => {
    expect(normalizeEmail("  JOHN@Example.COM  ")).toBe("john@example.com");
  });

  test("returns null for invalid email", () => {
    expect(normalizeEmail("not-an-email")).toBeNull();
  });
});

describe("Boolean Normalization", () => {
  test("handles various true values", () => {
    expect(normalizeBoolean("true")).toBe(true);
    expect(normalizeBoolean("yes")).toBe(true);
    expect(normalizeBoolean("1")).toBe(true);
    expect(normalizeBoolean("Y")).toBe(true);
  });

  test("handles various false values", () => {
    expect(normalizeBoolean("false")).toBe(false);
    expect(normalizeBoolean("no")).toBe(false);
    expect(normalizeBoolean("0")).toBe(false);
    expect(normalizeBoolean("N")).toBe(false);
  });

  test("returns null for invalid", () => {
    expect(normalizeBoolean("maybe")).toBeNull();
  });
});

describe("Duplicate Detection", () => {
  test("detects duplicate records", () => {
    const records = [
      { name: "John", email: "john@example.com" },
      { name: "Jane", email: "jane@example.com" },
      { name: "John", email: "john@example.com" },
    ];

    const result = detectDuplicates(records);

    expect(result.uniqueRecords).toHaveLength(2);
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].row).toBe(3);
  });

  test("detects duplicates by key fields", () => {
    const records = [
      { id: "1", name: "John", email: "john@a.com" },
      { id: "2", name: "Jane", email: "jane@a.com" },
      { id: "1", name: "John Doe", email: "john@b.com" },
    ];

    const result = detectDuplicates(records, ["id"]);

    expect(result.uniqueRecords).toHaveLength(2);
    expect(result.duplicates).toHaveLength(1);
  });
});
