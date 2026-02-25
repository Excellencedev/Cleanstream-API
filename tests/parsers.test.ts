import { describe, expect, test } from "bun:test";
import { parseCSV } from "../src/parsers/csv";
import { parseJSON } from "../src/parsers/json";
import { parseXML } from "../src/parsers/xml";

describe("CSV Parser", () => {
  test("parses simple CSV", () => {
    const csv = `name,email,age
John,john@example.com,30
Jane,jane@example.com,25`;

    const result = parseCSV(csv);

    expect(result.headers).toEqual(["name", "email", "age"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      name: "John",
      email: "john@example.com",
      age: "30",
    });
  });

  test("handles empty CSV", () => {
    const result = parseCSV("");
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  test("trims whitespace", () => {
    const csv = `name,email
  John  ,  john@example.com  `;

    const result = parseCSV(csv);
    expect(result.rows[0].name).toBe("John");
    expect(result.rows[0].email).toBe("john@example.com");
  });
});

describe("JSON Parser", () => {
  test("parses array of objects", () => {
    const json = JSON.stringify([
      { name: "John", email: "john@example.com" },
      { name: "Jane", email: "jane@example.com" },
    ]);

    const result = parseJSON(json);

    expect(result.headers).toContain("name");
    expect(result.headers).toContain("email");
    expect(result.rows).toHaveLength(2);
  });

  test("handles data wrapper", () => {
    const json = JSON.stringify({
      data: [{ name: "John" }],
    });

    const result = parseJSON(json);
    expect(result.rows[0].name).toBe("John");
  });

  test("handles records wrapper", () => {
    const json = JSON.stringify({
      records: [{ id: "123" }],
    });

    const result = parseJSON(json);
    expect(result.rows[0].id).toBe("123");
  });
});

describe("XML Parser", () => {
  test("parses XML with records", () => {
    const xml = `<?xml version="1.0"?>
<data>
  <record>
    <name>John</name>
    <email>john@example.com</email>
  </record>
  <record>
    <name>Jane</name>
    <email>jane@example.com</email>
  </record>
</data>`;

    const result = parseXML(xml);

    expect(result.headers).toContain("name");
    expect(result.headers).toContain("email");
    expect(result.rows).toHaveLength(2);
  });
});
