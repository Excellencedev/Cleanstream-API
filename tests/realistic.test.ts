import { expect, test, describe } from "bun:test";
import { normalizeRecords } from "../src/normalizer/index.js";
import { inferSchema } from "../src/inference/index.js";
import { FieldType } from "../src/models/schema.js";

describe("Realistic Data Normalization", () => {
  test("should handle messy customer data", () => {
    const headers = ["Full Name", "E-mail", "Join Date", "Subscription Fee", "Active?"];
    const rows = [
      {
        "Full Name": "  Alice Smith  ",
        "E-mail": "ALICE@EXAMPLE.COM",
        "Join Date": "2023/05/15",
        "Subscription Fee": "$99.99",
        "Active?": "yes"
      },
      {
        "Full Name": "Bob Jones",
        "E-mail": " bob@gmail.com ",
        "Join Date": "12-31-2022",
        "Subscription Fee": "€49,50",
        "Active?": "no"
      },
      {
        "Full Name": "Charlie Brown",
        "E-mail": "charlie@brown.net",
        "Join Date": "Jan 1, 2024",
        "Subscription Fee": "1.234,56",
        "Active?": "1"
      }
    ];

    const schema = inferSchema(headers, rows);
    const { records, errors } = normalizeRecords(rows, schema, headers);

    expect(errors.filter(e => e.severity === 'error')).toHaveLength(0);
    expect(records).toHaveLength(3);

    expect(records[0].full_name).toBe("Alice Smith");
    expect(records[0].email).toBe("alice@example.com");
    expect(records[0].join_date).toBe("2023-05-15");
    expect(records[0].subscription_fee).toBe(99.99);
    expect(records[0].active).toBe(true);

    expect(records[1].subscription_fee).toBe(49.50);
    expect(records[1].join_date).toBe("2022-12-31");
    expect(records[1].active).toBe(false);

    expect(records[2].active).toBe(true);
  });

  test("should report errors for invalid data types", () => {
    const headers = ["email", "age"];
    const rows = [
      { "email": "valid@test.com", "age": "25" },
      { "email": "not-an-email", "age": "not-a-number" }
    ];

    const schema = [
        { name: "email", type: FieldType.Email, confidence: 1 },
        { name: "age", type: FieldType.Number, confidence: 1 }
    ];

    const { records, errors } = normalizeRecords(rows, schema, ["email", "age"]);

    const errorIssues = errors.filter(e => e.severity === 'error');
    expect(errorIssues).toHaveLength(2);
    expect(errorIssues[0].field).toBe("email");
    expect(errorIssues[1].field).toBe("age");
  });
});
