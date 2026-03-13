import { describe, expect, test } from "bun:test";
import { authMiddleware } from "../src/middleware/auth.js";
import { validateHandler } from "../src/handlers/validate.js";
import { schemaDefineHandler } from "../src/handlers/schema.js";
import { ingestHandler } from "../src/handlers/ingest.js";

function createMockRes() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(key: string, value: string) {
      this.headers[key.toLowerCase()] = value;
    },
  };
}

describe("Integration: auth middleware", () => {
  test("returns 401 when missing auth header", () => {
    const req = { headers: {} } as any;
    const res = createMockRes();
    let called = false;

    authMiddleware(req, res as any, () => {
      called = true;
    });

    expect(called).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  test("returns 401 when malformed auth header", () => {
    const req = { headers: { authorization: "Bad token" } } as any;
    const res = createMockRes();

    authMiddleware(req, res as any, () => undefined);

    expect(res.statusCode).toBe(401);
  });

  test("returns 403 when invalid API key", () => {
    const req = { headers: { authorization: "Bearer nope" } } as any;
    const res = createMockRes();

    authMiddleware(req, res as any, () => undefined);

    expect(res.statusCode).toBe(403);
  });

  test("calls next on valid API key", () => {
    const req = { headers: { authorization: "Bearer test-api-key" } } as any;
    const res = createMockRes();
    let called = false;

    authMiddleware(req, res as any, () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(res.statusCode).toBe(200);
  });
});

describe("Integration: validate handler", () => {
  test("returns 400 on invalid payload", async () => {
    const req = { body: { data: "not-an-array" } } as any;
    const res = createMockRes();

    await validateHandler(req, res as any);

    expect(res.statusCode).toBe(400);
  });

  test("returns issues for invalid email", async () => {
    const req = {
      body: {
        schema: { fields: [{ name: "email", type: "email" }] },
        data: [{ email: "bad-email" }],
      },
    } as any;
    const res = createMockRes();

    await validateHandler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect((res.body as any).valid).toBe(false);
    expect((res.body as any).issues.length).toBeGreaterThan(0);
  });

  test("infers schema when not provided", async () => {
    const req = {
      body: {
        data: [{ name: "Alice", joined_at: "2024-01-01" }],
      },
    } as any;
    const res = createMockRes();

    await validateHandler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect((res.body as any).valid).toBe(true);
  });
});

describe("Integration: schema handler", () => {
  test("creates schema", async () => {
    const req = {
      body: {
        name: "integration_schema",
        targetSchema: {
          fields: [{ name: "email", type: "email" }],
        },
      },
    } as any;
    const res = createMockRes();

    await schemaDefineHandler(req, res as any);

    expect(res.statusCode).toBe(201);
    expect((res.body as any).id).toBeDefined();
  });

  test("rejects invalid schema payload", async () => {
    const req = {
      body: { name: "bad", targetSchema: { fields: [{ name: "x" }] } },
    } as any;
    const res = createMockRes();

    await schemaDefineHandler(req, res as any);

    expect(res.statusCode).toBe(400);
  });
});

describe("Integration: ingest handler", () => {
  test("returns 400 with no file or data", async () => {
    const req = {
      method: "POST",
      originalUrl: "/ingest",
      body: {},
      header: () => undefined,
    } as any;
    const res = createMockRes();

    await ingestHandler(req, res as any);

    expect(res.statusCode).toBe(400);
  });

  test("replays response for same idempotency key and payload", async () => {
    const reqBody = { data: [{ email: "same@example.com", amount: "$20" }] };
    const req1 = {
      method: "POST",
      originalUrl: "/ingest",
      body: reqBody,
      header: (name: string) =>
        name === "Idempotency-Key" ? "integration-key-1" : undefined,
    } as any;
    const res1 = createMockRes();

    await ingestHandler(req1, res1 as any);
    expect(res1.statusCode).toBe(200);

    const req2 = {
      ...req1,
      body: reqBody,
    } as any;
    const res2 = createMockRes();

    await ingestHandler(req2, res2 as any);
    expect(res2.statusCode).toBe(200);
    expect(res2.headers["x-idempotent-replay"]).toBe("true");
    expect((res2.body as any).jobId).toBe((res1.body as any).jobId);
  });

  test("returns 409 for changed payload with same idempotency key", async () => {
    const req1 = {
      method: "POST",
      originalUrl: "/ingest",
      body: { data: [{ value: "a" }] },
      header: (name: string) =>
        name === "Idempotency-Key" ? "integration-key-2" : undefined,
    } as any;
    const res1 = createMockRes();

    await ingestHandler(req1, res1 as any);
    expect(res1.statusCode).toBe(200);

    const req2 = {
      ...req1,
      body: { data: [{ value: "b" }] },
    } as any;
    const res2 = createMockRes();

    await ingestHandler(req2, res2 as any);

    expect(res2.statusCode).toBe(409);
  });
});
