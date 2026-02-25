import { describe, expect, test } from "bun:test";
import {
  detectFieldType,
  inferSchema,
  normalizeHeader,
} from "../src/inference/types";
import {
  inferFieldRelationship,
  normalizeHeaders,
} from "../src/inference/headers";
import { FieldType } from "../src/models/schema";

describe("Type Detection", () => {
  test("detects email", () => {
    const result = detectFieldType([
      "john@example.com",
      "jane@test.org",
      "bob@mail.co",
    ]);
    expect(result.type).toBe(FieldType.Email);
    expect(result.confidence).toBe(1);
  });

  test("detects number", () => {
    const result = detectFieldType(["123", "456.78", "999"]);
    expect(result.type).toBe(FieldType.Number);
    expect(result.confidence).toBe(1);
  });

  test("detects boolean", () => {
    const result = detectFieldType(["true", "false", "yes", "no"]);
    expect(result.type).toBe(FieldType.Boolean);
    expect(result.confidence).toBe(1);
  });

  test("detects date", () => {
    const result = detectFieldType(["2024-01-15", "2024-02-20", "2024-03-25"]);
    expect(result.type).toBe(FieldType.Date);
    expect(result.confidence).toBe(1);
  });

  test("defaults to string", () => {
    const result = detectFieldType(["hello", "world", "test"]);
    expect(result.type).toBe(FieldType.String);
  });
});

describe("Header Normalization", () => {
  test("normalizes to snake_case", () => {
    expect(normalizeHeader("First Name")).toBe("first_name");
    expect(normalizeHeader("  EMAIL ADDRESS  ")).toBe("email_address");
    expect(normalizeHeader("User-ID")).toBe("userid");
  });
});

describe("Schema Inference", () => {
  test("infers schema from data", () => {
    const headers = ["Name", "Email", "Age"];
    const rows = [
      { Name: "John", Email: "john@example.com", Age: "30" },
      { Name: "Jane", Email: "jane@example.com", Age: "25" },
    ];

    const schema = inferSchema(headers, rows);

    expect(schema).toHaveLength(3);
    expect(schema[0].name).toBe("name");
    expect(schema[0].type).toBe(FieldType.String);
    expect(schema[1].type).toBe(FieldType.Email);
    expect(schema[2].type).toBe(FieldType.Number);
  });
});

describe("Field Relationship Inference", () => {
  test("maps user_email to email", () => {
    expect(inferFieldRelationship("user_email")).toBe("email");
    expect(inferFieldRelationship("user email")).toBe("email");
    expect(inferFieldRelationship("contact_email")).toBe("email");
  });

  test("maps phone variants", () => {
    expect(inferFieldRelationship("phone_number")).toBe("phone");
    expect(inferFieldRelationship("telephone")).toBe("phone");
    expect(inferFieldRelationship("mobile")).toBe("phone");
  });

  test("handles duplicate headers", () => {
    const result = normalizeHeaders(["email", "user_email", "contact_email"]);
    expect(result).toEqual(["email", "email_2", "email_3"]);
  });
});
