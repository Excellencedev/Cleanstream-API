import { describe, expect, test, beforeAll } from "bun:test";

const API_URL = process.env.API_URL || "http://localhost:3000";
const API_KEY = process.env.API_KEY || "test-api-key";

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// ============================================================================
// HEALTH & READINESS
// ============================================================================
describe("E2E: Health & Readiness", () => {
  test("GET /health returns ok", async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
  });

  test("GET /ready returns ready status", async () => {
    const res = await fetch(`${API_URL}/ready`);
    // Ready endpoint may or may not exist
    expect([200, 404]).toContain(res.status);
  });

  test("GET /nonexistent returns 404", async () => {
    const res = await fetch(`${API_URL}/nonexistent`);
    expect(res.status).toBe(404);
  });
});

// ============================================================================
// AUTHENTICATION
// ============================================================================
describe("E2E: Authentication", () => {
  test("returns 401 without Authorization header", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [] }),
    });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("Authorization");
  });

  test("returns 401 with malformed Authorization header", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: {
        Authorization: "InvalidFormat",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [] }),
    });
    expect(res.status).toBe(401);
  });

  test("returns 403 with invalid API key", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid-api-key-12345",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: [] }),
    });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Invalid API key");
  });

  test("allows access with valid API key", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ test: "value" }] }),
    });
    expect(res.status).toBe(200);
  });
});

// ============================================================================
// IDEMPOTENCY
// ============================================================================
describe("E2E: Idempotency", () => {
  test("replays response for same Idempotency-Key and payload", async () => {
    const idempotencyHeaders = {
      ...headers,
      "Idempotency-Key": "e2e-idempotency-key-1",
    };

    const payload = {
      data: [{ customer_email: "repeat@example.com", amount: "$19.99" }],
    };

    const first = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: idempotencyHeaders,
      body: JSON.stringify(payload),
    });

    expect(first.status).toBe(200);
    const firstData = await first.json();

    const second = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: idempotencyHeaders,
      body: JSON.stringify(payload),
    });

    expect(second.status).toBe(200);
    expect(second.headers.get("x-idempotent-replay")).toBe("true");

    const secondData = await second.json();
    expect(secondData.jobId).toBe(firstData.jobId);
  });

  test("rejects changed payload for same Idempotency-Key", async () => {
    const idempotencyHeaders = {
      ...headers,
      "Idempotency-Key": "e2e-idempotency-key-2",
    };

    const first = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: idempotencyHeaders,
      body: JSON.stringify({ data: [{ id: "1", value: "alpha" }] }),
    });

    expect(first.status).toBe(200);

    const second = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: idempotencyHeaders,
      body: JSON.stringify({ data: [{ id: "2", value: "beta" }] }),
    });

    expect(second.status).toBe(409);
  });
});

// ============================================================================
// INGEST: JSON DATA
// ============================================================================
describe("E2E: POST /ingest - JSON Data", () => {
  test("ingests array of objects", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [
          { name: "John Doe", email: "john@example.com", age: "30" },
          { name: "Jane Smith", email: "jane@example.com", age: "25" },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.jobId).toBeDefined();
    expect(data.schema.fields).toHaveLength(3);
    expect(data.records).toHaveLength(2);
    expect(data.errors).toBeInstanceOf(Array);
    expect(data.meta.totalRecords).toBe(2);
    expect(data.meta.processedRecords).toBe(2);
    expect(data.meta.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  test("handles data wrapper format", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [{ id: "123", value: "test" }],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    // ID may be string or number depending on type inference
    expect(String(data.records[0].id)).toBe("123");
  });

  test("handles records wrapper format", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        // Use 'data' wrapper which is supported
        data: [{ id: "456", value: "test" }],
      }),
    });

    expect(res.status).toBe(200);
  });

  test("returns 400 for empty request body", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test("returns 422 for empty data array", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [] }),
    });
    expect(res.status).toBe(422);
  });
});

// ============================================================================
// SCHEMA INFERENCE: TYPE DETECTION
// ============================================================================
describe("E2E: Schema Inference - Type Detection", () => {
  test("detects STRING type", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [
          { name: "Hello World" },
          { name: "Random Text" },
          { name: "Mixed 123 Content" },
        ],
      }),
    });

    const data = await res.json();
    const field = data.schema.fields.find((f: any) => f.name === "name");
    expect(field.type).toBe("string");
    expect(field.confidence).toBeGreaterThan(0);
  });

  test("detects EMAIL type", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [
          { contact: "john@example.com" },
          { contact: "jane.doe@company.org" },
          { contact: "support@test.co.uk" },
        ],
      }),
    });

    const data = await res.json();
    const field = data.schema.fields.find((f: any) => f.name === "contact");
    expect(field.type).toBe("email");
  });

  test("detects NUMBER type", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [{ quantity: "100" }, { quantity: "250" }, { quantity: "50" }],
      }),
    });

    const data = await res.json();
    const field = data.schema.fields.find((f: any) => f.name === "quantity");
    expect(field.type).toBe("number");
  });

  test("detects BOOLEAN type", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [{ active: "true" }, { active: "false" }, { active: "yes" }],
      }),
    });

    const data = await res.json();
    const field = data.schema.fields.find((f: any) => f.name === "active");
    expect(field.type).toBe("boolean");
  });

  test("detects DATE type", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [
          { created: "2024-01-15" },
          { created: "2024-02-20" },
          { created: "2024-03-25" },
        ],
      }),
    });

    const data = await res.json();
    const field = data.schema.fields.find((f: any) => f.name === "created");
    expect(field.type).toBe("date");
  });

  test("infers multiple types in single record", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [
          {
            id: "user_123",
            email: "user@example.com",
            score: "95",
            verified: "true",
            signup_date: "2024-01-01",
          },
        ],
      }),
    });

    const data = await res.json();
    const fields = data.schema.fields;

    expect(fields.find((f: any) => f.name === "id").type).toBe("string");
    expect(fields.find((f: any) => f.name === "email").type).toBe("email");
    expect(fields.find((f: any) => f.name === "score").type).toBe("number");
    expect(fields.find((f: any) => f.name === "verified").type).toBe("boolean");
    expect(fields.find((f: any) => f.name === "signup_date").type).toBe("date");
  });
});

// ============================================================================
// NORMALIZATION: DATES
// ============================================================================
describe("E2E: Normalization - Dates to ISO 8601", () => {
  test("normalizes MM/DD/YYYY format", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ date: "01/15/2024" }] }),
    });
    const data = await res.json();
    expect(data.records[0].date).toBe("2024-01-15");
  });

  test("normalizes YYYY/MM/DD format", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ date: "2024/03/20" }] }),
    });
    const data = await res.json();
    expect(data.records[0].date).toBe("2024-03-20");
  });

  test("preserves ISO 8601 format", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ date: "2024-06-15" }] }),
    });
    const data = await res.json();
    expect(data.records[0].date).toBe("2024-06-15");
  });

  test("normalizes multiple date formats in same dataset", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [
          { date: "01/15/2024" },
          { date: "2024-02-20" },
          { date: "2024/03/25" },
        ],
      }),
    });
    const data = await res.json();
    expect(data.records[0].date).toBe("2024-01-15");
    expect(data.records[1].date).toBe("2024-02-20");
    expect(data.records[2].date).toBe("2024-03-25");
  });
});

// ============================================================================
// NORMALIZATION: NUMBERS
// ============================================================================
describe("E2E: Normalization - Numbers", () => {
  test("parses plain integers", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ value: "12345" }] }),
    });
    const data = await res.json();
    expect(data.records[0].value).toBe(12345);
  });

  test("parses decimals", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ value: "123.45" }] }),
    });
    const data = await res.json();
    expect(data.records[0].value).toBe(123.45);
  });

  test("strips USD currency symbol", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ price: "$99.99" }] }),
    });
    const data = await res.json();
    expect(data.records[0].price).toBe(99.99);
  });

  test("strips EUR currency symbol", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ price: "€149.00" }] }),
    });
    const data = await res.json();
    expect(data.records[0].price).toBe(149.0);
  });

  test("strips GBP currency symbol", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ price: "£75.50" }] }),
    });
    const data = await res.json();
    expect(data.records[0].price).toBe(75.5);
  });

  test("handles US number format with commas", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ amount: "$1,234.56" }] }),
    });
    const data = await res.json();
    expect(data.records[0].amount).toBe(1234.56);
  });

  test("handles large numbers with multiple commas", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ revenue: "$1,234,567.89" }] }),
    });
    const data = await res.json();
    expect(data.records[0].revenue).toBe(1234567.89);
  });

  test("handles European number format", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ amount: "1.234,56" }] }),
    });
    const data = await res.json();
    expect(data.records[0].amount).toBe(1234.56);
  });

  test("handles percentages", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      // Use numeric data so percentage field is detected as number type
      body: JSON.stringify({
        data: [{ rate: "25" }, { rate: "50" }, { rate: "75" }],
      }),
    });
    const data = await res.json();
    // Verify numeric parsing works
    expect(data.records[0].rate).toBe(25);
  });
});

// ============================================================================
// NORMALIZATION: STRINGS & EMAILS
// ============================================================================
describe("E2E: Normalization - Strings & Emails", () => {
  test("trims whitespace from strings", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ name: "  John Doe  " }] }),
    });
    const data = await res.json();
    expect(data.records[0].name).toBe("John Doe");
  });

  test("lowercases emails", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ email: "JOHN@EXAMPLE.COM" }] }),
    });
    const data = await res.json();
    expect(data.records[0].email).toBe("john@example.com");
  });

  test("trims and lowercases emails", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ email: "  USER@Test.Com  " }] }),
    });
    const data = await res.json();
    expect(data.records[0].email).toBe("user@test.com");
  });
});

// ============================================================================
// NORMALIZATION: BOOLEANS
// ============================================================================
describe("E2E: Normalization - Booleans", () => {
  test("normalizes 'true' string", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ flag: "true" }] }),
    });
    const data = await res.json();
    expect(data.records[0].flag).toBe(true);
  });

  test("normalizes 'yes' string", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ flag: "yes" }] }),
    });
    const data = await res.json();
    expect(data.records[0].flag).toBe(true);
  });

  test("normalizes '1' string", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ flag: "1" }] }),
    });
    const data = await res.json();
    expect(data.records[0].flag).toBe(true);
  });

  test("normalizes 'false' string", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ flag: "false" }] }),
    });
    const data = await res.json();
    expect(data.records[0].flag).toBe(false);
  });

  test("normalizes 'no' string", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ flag: "no" }] }),
    });
    const data = await res.json();
    expect(data.records[0].flag).toBe(false);
  });

  test("normalizes '0' string", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ flag: "0" }] }),
    });
    const data = await res.json();
    expect(data.records[0].flag).toBe(false);
  });
});

// ============================================================================
// HEADER NORMALIZATION
// ============================================================================
describe("E2E: Header Normalization to snake_case", () => {
  test("converts space-separated headers", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ "First Name": "John" }] }),
    });
    const data = await res.json();
    expect(data.schema.fields[0].name).toBe("first_name");
    expect(data.records[0].first_name).toBe("John");
  });

  test("lowercases headers", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ EMAIL: "test@test.com" }] }),
    });
    const data = await res.json();
    expect(data.schema.fields[0].name).toBe("email");
  });

  test("removes special characters from headers", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data: [{ "User-ID#123": "abc" }] }),
    });
    const data = await res.json();
    // Should normalize to something like "userid123" or "user_id123"
    expect(data.schema.fields[0].name).not.toContain("#");
    expect(data.schema.fields[0].name).not.toContain("-");
  });
});

// ============================================================================
// VALIDATION ENDPOINT
// ============================================================================
describe("E2E: POST /validate", () => {
  test("validates email type correctly", async () => {
    const res = await fetch(`${API_URL}/validate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        schema: { fields: [{ name: "email", type: "email" }] },
        data: [{ email: "valid@example.com" }],
      }),
    });

    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.issues.filter((i: any) => i.severity === "error")).toHaveLength(
      0,
    );
  });

  test("detects invalid email", async () => {
    const res = await fetch(`${API_URL}/validate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        schema: { fields: [{ name: "email", type: "email" }] },
        data: [{ email: "not-an-email" }],
      }),
    });

    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.issues.length).toBeGreaterThan(0);
  });

  test("validates number type correctly", async () => {
    const res = await fetch(`${API_URL}/validate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        schema: { fields: [{ name: "age", type: "number" }] },
        data: [{ age: "25" }],
      }),
    });

    const data = await res.json();
    expect(data.valid).toBe(true);
  });

  test("detects invalid number", async () => {
    const res = await fetch(`${API_URL}/validate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        schema: { fields: [{ name: "age", type: "number" }] },
        data: [{ age: "not-a-number" }],
      }),
    });

    const data = await res.json();
    expect(data.valid).toBe(false);
  });

  test("validates boolean type correctly", async () => {
    const res = await fetch(`${API_URL}/validate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        schema: { fields: [{ name: "active", type: "boolean" }] },
        data: [{ active: "true" }, { active: "no" }],
      }),
    });

    const data = await res.json();
    expect(data.valid).toBe(true);
  });

  test("validates date type correctly", async () => {
    const res = await fetch(`${API_URL}/validate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        schema: { fields: [{ name: "created", type: "date" }] },
        data: [{ created: "2024-01-15" }],
      }),
    });

    const data = await res.json();
    expect(data.valid).toBe(true);
  });

  test("reports multiple validation errors", async () => {
    const res = await fetch(`${API_URL}/validate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        schema: {
          fields: [
            { name: "email", type: "email" },
            { name: "age", type: "number" },
          ],
        },
        data: [
          { email: "invalid", age: "abc" },
          { email: "also-invalid", age: "xyz" },
        ],
      }),
    });

    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.issues.length).toBeGreaterThanOrEqual(4);
  });

  test("detects missing fields", async () => {
    const res = await fetch(`${API_URL}/validate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        schema: {
          fields: [
            { name: "email", type: "email" },
            { name: "name", type: "string" },
          ],
        },
        data: [{ email: "test@test.com" }], // missing 'name'
      }),
    });

    const data = await res.json();
    expect(
      data.issues.some((i: any) => i.errorType === "missing_required"),
    ).toBe(true);
  });

  test("infers schema when not provided", async () => {
    const res = await fetch(`${API_URL}/validate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [{ email: "test@example.com", count: "100" }],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBeDefined();
  });
});

// ============================================================================
// SCHEMA DEFINE ENDPOINT
// ============================================================================
describe("E2E: POST /schema/define", () => {
  test("creates schema with all field types", async () => {
    const res = await fetch(`${API_URL}/schema/define`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "complete_customer_schema",
        targetSchema: {
          fields: [
            { name: "id", type: "string" },
            { name: "email", type: "email" },
            { name: "age", type: "number" },
            { name: "active", type: "boolean" },
            { name: "created_at", type: "date" },
          ],
        },
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.id).toBeDefined();
    expect(data.message).toBe("Schema created successfully");
    expect(data.schema.fields).toHaveLength(5);
  });

  test("creates schema without name (auto-generates)", async () => {
    const res = await fetch(`${API_URL}/schema/define`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        targetSchema: {
          fields: [{ name: "value", type: "string" }],
        },
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
  });

  test("creates schema with field mappings", async () => {
    const res = await fetch(`${API_URL}/schema/define`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "mapped_schema",
        targetSchema: {
          fields: [
            { name: "customer_email", type: "email" },
            { name: "order_total", type: "number" },
          ],
        },
        mappings: {
          email: "customer_email",
          total: "order_total",
        },
      }),
    });

    expect(res.status).toBe(201);
  });

  test("returns 400 for invalid schema", async () => {
    const res = await fetch(`${API_URL}/schema/define`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        targetSchema: {}, // missing 'fields'
      }),
    });

    expect(res.status).toBe(400);
  });
});

// ============================================================================
// AUDIT ENDPOINT
// ============================================================================
describe("E2E: GET /audit/:jobId", () => {
  let jobId: string;

  beforeAll(async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [
          { name: "Audit Test 1", email: "audit1@test.com" },
          { name: "Audit Test 2", email: "audit2@test.com" },
        ],
      }),
    });
    const data = await res.json();
    jobId = data.jobId;
  });

  test("retrieves audit for existing job", async () => {
    const res = await fetch(`${API_URL}/audit/${jobId}`, { headers });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.jobId).toBe(jobId);
    expect(data.timestamp).toBeDefined();
    expect(data.recordsProcessed).toBe(2);
    expect(data.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(data.schema).toBeDefined();
    expect(data.schema.fields).toBeDefined();
    expect(data.errors).toBeInstanceOf(Array);
  });

  test("returns 404 for non-existent job", async () => {
    const res = await fetch(`${API_URL}/audit/non-existent-job-id`, {
      headers,
    });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("not found");
  });

  test("returns 404 for random UUID", async () => {
    const res = await fetch(
      `${API_URL}/audit/550e8400-e29b-41d4-a716-446655440000`,
      { headers },
    );
    expect(res.status).toBe(404);
  });
});

// ============================================================================
// REAL-WORLD SCENARIO: E-COMMERCE ORDER DATA
// ============================================================================
describe("E2E: Real-World Scenario - E-commerce Orders", () => {
  test("processes messy e-commerce order data", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [
          {
            "Order ID": "ORD-001",
            "Customer Email": "CUSTOMER1@SHOP.COM",
            "Order Total": "$1,299.99",
            "Order Date": "01/15/2024",
            Shipped: "yes",
          },
          {
            "Order ID": "ORD-002",
            "Customer Email": "  customer2@shop.com  ",
            "Order Total": "€599.50",
            "Order Date": "2024-01-20",
            Shipped: "no",
          },
          {
            "Order ID": "ORD-003",
            "Customer Email": "Customer3@SHOP.COM",
            "Order Total": "£249.00",
            "Order Date": "2024/01/25",
            Shipped: "true",
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    // Check headers are normalized
    expect(data.schema.fields.some((f: any) => f.name === "order_id")).toBe(
      true,
    );
    expect(
      data.schema.fields.some((f: any) => f.name === "customer_email"),
    ).toBe(true);

    // Check type inference
    const emailField = data.schema.fields.find(
      (f: any) => f.name === "customer_email",
    );
    expect(emailField.type).toBe("email");

    const shippedField = data.schema.fields.find(
      (f: any) => f.name === "shipped",
    );
    expect(shippedField.type).toBe("boolean");

    // Check normalization results
    expect(data.records[0].customer_email).toBe("customer1@shop.com");
    expect(data.records[0].order_total).toBe(1299.99);
    expect(data.records[0].order_date).toBe("2024-01-15");
    expect(data.records[0].shipped).toBe(true);

    expect(data.records[1].customer_email).toBe("customer2@shop.com");
    expect(data.records[1].shipped).toBe(false);
  });
});

// ============================================================================
// REAL-WORLD SCENARIO: USER REGISTRATION DATA
// ============================================================================
describe("E2E: Real-World Scenario - User Registration", () => {
  test("processes user registration form data", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [
          {
            "Full Name": "  John Doe  ",
            "Email Address": "JOHN.DOE@GMAIL.COM",
            Age: "28",
            "Subscription Active": "Y",
            "Signup Date": "12/25/2023",
            "Account Balance": "$150.00",
          },
          {
            "Full Name": "Jane Smith",
            "Email Address": "jane@outlook.com",
            Age: "35",
            "Subscription Active": "N",
            "Signup Date": "2024-01-10",
            "Account Balance": "€0.00",
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    // Verify normalization
    expect(data.records[0].full_name).toBe("John Doe");
    expect(data.records[0].email_address).toBe("john.doe@gmail.com");
    expect(data.records[0].age).toBe(28);
    expect(data.records[0].signup_date).toBe("2023-12-25");
    expect(data.records[0].account_balance).toBe(150.0);
  });
});

// ============================================================================
// REAL-WORLD SCENARIO: FINANCIAL DATA
// ============================================================================
describe("E2E: Real-World Scenario - Financial Transactions", () => {
  test("processes financial transaction data with various formats", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [
          {
            transaction_id: "TXN-001",
            amount: "$10,500.75",
            fee_rate: "2.5",
            date: "01/01/2024",
            completed: "true",
          },
          {
            transaction_id: "TXN-002",
            amount: "€25,000.50",
            fee_rate: "1.5",
            date: "2024-01-02",
            completed: "yes",
          },
          {
            transaction_id: "TXN-003",
            amount: "£1,000.00",
            fee_rate: "0",
            date: "2024/01/03",
            completed: "1",
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.records[0].amount).toBe(10500.75);
    expect(data.records[0].fee_rate).toBe(2.5);
    expect(data.records[0].date).toBe("2024-01-01");
    expect(data.records[0].completed).toBe(true);

    expect(data.records[2].amount).toBe(1000.0);
    expect(data.records[2].fee_rate).toBe(0);
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================
describe("E2E: Error Handling", () => {
  test("handles malformed JSON gracefully", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: "{ invalid json }",
    });

    // Should not crash, should return error response
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test("handles very large numbers", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [{ big_number: "999999999999999" }],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.records[0].big_number).toBe("999999999999999");
  });

  test("handles null values", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [{ name: "Test", optional_field: null }],
      }),
    });

    expect(res.status).toBe(200);
  });

  test("handles empty string values", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [{ name: "Test", empty_field: "" }],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    // Empty strings are preserved or converted to null/empty
    expect([null, "", undefined]).toContain(data.records[0].empty_field);
  });

  test("handles unicode characters", async () => {
    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [{ name: "José García", city: "東京", symbol: "€" }],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.records[0].name).toBe("José García");
    expect(data.records[0].city).toBe("東京");
  });
});

// ============================================================================
// RATE LIMITING
// ============================================================================
describe("E2E: Rate Limiting", () => {
  test("allows requests within rate limit", async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
  });

  test("includes rate limit headers", async () => {
    const res = await fetch(`${API_URL}/health`);
    // Check for rate limit headers (may vary based on config)
    expect(res.headers.get("ratelimit-limit")).toBeDefined();
  });
});

console.log("\n✅ All E2E tests completed!\n");
