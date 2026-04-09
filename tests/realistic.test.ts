import { expect, test, describe } from "bun:test";
import { normalizeRecords } from "../src/normalizer/index.js";
import { inferSchema } from "../src/inference/index.js";
import { FieldType } from "../src/models/schema.js";

describe("Advanced Normalization", () => {
  test("should handle messy customer data with names and phone numbers", () => {
    const headers = [
      "Full Name",
      "E-mail",
      "Phone",
      "Join Date",
      "Subscription Fee",
      "Active?",
    ];
    const rows = [
      {
        "Full Name": "  alice smith  ",
        "E-mail": "ALICE@EXAMPLE.COM",
        Phone: "(555) 123-4567",
        "Join Date": "2023/05/15",
        "Subscription Fee": "$99.99",
        "Active?": "yes",
      },
      {
        "Full Name": "BOB JONES",
        "E-mail": " bob@gmail.com ",
        Phone: "+1-555-987-6543",
        "Join Date": "12-31-2022",
        "Subscription Fee": "€49,50",
        "Active?": "no",
      },
      {
        "Full Name": "charlie brown",
        "E-mail": "charlie@brown.net",
        Phone: "5558881212",
        "Join Date": "Jan 1, 2024",
        "Subscription Fee": "1.234,56",
        "Active?": "1",
      },
    ];

    const schema = [
      { name: "full_name", type: FieldType.Name, confidence: 1 },
      { name: "email", type: FieldType.Email, confidence: 1 },
      { name: "phone", type: FieldType.Phone, confidence: 1 },
      { name: "join_date", type: FieldType.Date, confidence: 1 },
      { name: "subscription_fee", type: FieldType.Number, confidence: 1 },
      { name: "active", type: FieldType.Boolean, confidence: 1 },
    ];

    const { records, errors } = normalizeRecords(rows, schema, headers);

    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);
    expect(records).toHaveLength(3);

    expect(records[0].full_name).toBe("Alice Smith");
    expect(records[0].email).toBe("alice@example.com");
    expect(records[0].phone).toBe("+15551234567");
    expect(records[0].join_date).toBe("2023-05-15");
    expect(records[0].subscription_fee).toBe(99.99);
    expect(records[0].active).toBe(true);

    expect(records[1].full_name).toBe("Bob Jones");
    expect(records[1].phone).toBe("+15559876543");
    expect(records[1].subscription_fee).toBe(49.5);
    expect(records[1].join_date).toBe("2022-12-31");
    expect(records[1].active).toBe(false);

    expect(records[2].full_name).toBe("Charlie Brown");
    expect(records[2].phone).toBe("+15558881212");
    expect(records[2].active).toBe(true);
  });
});
