import { describe, expect, test } from "bun:test";

const API_URL = process.env.API_URL || "http://localhost:3000";
const API_KEY = process.env.API_KEY || "test-api-key";

const jsonHeaders = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

describe("E2E Extended: health and readiness semantics", () => {
  test("health includes environment", async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.environment).toBeDefined();
  });

  test("ready endpoint reports ready true when available", async () => {
    const res = await fetch(`${API_URL}/ready`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ready).toBe(true);
  });
});

describe("E2E Extended: ingest file upload pathways", () => {
  test("ingests CSV file upload", async () => {
    const form = new FormData();
    const csv = "name,email\nAlice,alice@example.com\nBob,bob@example.com\n";
    form.append("file", new Blob([csv], { type: "text/csv" }), "users.csv");

    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: form,
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.records).toHaveLength(2);
  });

  test("ingests JSON file upload", async () => {
    const form = new FormData();
    const json = JSON.stringify({
      data: [
        { name: "Ana", email: "ana@example.com" },
        { name: "Max", email: "max@example.com" },
      ],
    });
    form.append(
      "file",
      new Blob([json], { type: "application/json" }),
      "users.json",
    );

    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: form,
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.records).toHaveLength(2);
  });

  test("rejects unsupported file type", async () => {
    const form = new FormData();
    form.append("file", new Blob(["hello"], { type: "text/plain" }), "x.txt");

    const res = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: form,
    });

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("Failed to process input");
  });
});

describe("E2E Extended: idempotency edge behavior", () => {
  test("trims whitespace around Idempotency-Key", async () => {
    const headers = {
      ...jsonHeaders,
      "Idempotency-Key": "  spaced-key-1  ",
    };

    const payload = { data: [{ account: "A1", amount: "$12.34" }] };

    const first = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    expect(first.status).toBe(200);

    const second = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: {
        ...jsonHeaders,
        "Idempotency-Key": "spaced-key-1",
      },
      body: JSON.stringify(payload),
    });

    expect(second.status).toBe(200);
    expect(second.headers.get("x-idempotent-replay")).toBe("true");
  });

  test("without Idempotency-Key creates distinct jobs", async () => {
    const payload = { data: [{ order_id: "x-1", total: "10" }] };

    const first = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });
    const second = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const a = await first.json();
    const b = await second.json();
    expect(a.jobId).not.toBe(b.jobId);
  });
});

describe("E2E Extended: schema and validation behavior", () => {
  test("validate returns error for missing required field", async () => {
    const res = await fetch(`${API_URL}/validate`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        schema: {
          fields: [
            { name: "email", type: "email" },
            { name: "age", type: "number" },
          ],
        },
        data: [{ email: "good@example.com" }],
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    const missingIssue = data.issues.find((x: any) => x.errorType === "missing_required");
    expect(missingIssue).toBeDefined();
    expect(missingIssue.severity).toBe("error");
    expect(data.valid).toBe(false);
  });

  test("schema define accepts mappings and returns created schema", async () => {
    const res = await fetch(`${API_URL}/schema/define`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        name: "mapped_schema",
        targetSchema: { fields: [{ name: "email", type: "email" }] },
        mappings: { user_email: "email" },
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.schema.fields[0].name).toBe("email");
  });
});

describe("E2E Extended: audit flow", () => {
  test("audit returns schema and timing metadata", async () => {
    const ingestRes = await fetch(`${API_URL}/ingest`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        data: [{ email: "auditcheck@example.com", signed_up: "2024-02-01" }],
      }),
    });

    expect(ingestRes.status).toBe(200);
    const ingestData = await ingestRes.json();

    const auditRes = await fetch(`${API_URL}/audit/${ingestData.jobId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    expect(auditRes.status).toBe(200);
    const audit = await auditRes.json();

    expect(audit.schema.fields.length).toBeGreaterThan(0);
    expect(audit.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(audit.recordsProcessed).toBe(1);
  });
});
