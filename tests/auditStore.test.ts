import { describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  IngestionIdempotencyStore,
  PersistentAuditStore,
} from "../src/services/auditStore.js";
import { FieldType } from "../src/models/schema.js";

describe("PersistentAuditStore", () => {
  test("persists and reloads audit entries", async () => {
    const file = join(tmpdir(), `cleanstream-audit-${Date.now()}.db`);
    if (existsSync(file)) rmSync(file);

    const firstStore = new PersistentAuditStore(file);
    await firstStore.set("job-123", {
      jobId: "job-123",
      timestamp: new Date().toISOString(),
      recordsProcessed: 1,
      errors: [],
      schema: {
        fields: [{ name: "email", type: FieldType.Email, confidence: 1 }],
      },
      processingTimeMs: 10,
    });

    const secondStore = new PersistentAuditStore(file);
    const loaded = await secondStore.get("job-123");

    expect(loaded).toBeDefined();
    expect(loaded?.jobId).toBe("job-123");

    rmSync(file, { force: true });
  });
});

describe("IngestionIdempotencyStore", () => {
  test("expires records after TTL", async () => {
    const store = new IngestionIdempotencyStore(5);

    store.set({
      key: "abc",
      requestHash: "hash",
      response: {
        jobId: "job-1",
        schema: { fields: [] },
        records: [],
        errors: [],
        meta: { totalRecords: 0, processedRecords: 0, processingTimeMs: 0 },
      },
      createdAt: Date.now(),
    });

    expect(store.get("abc")).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(store.get("abc")).toBeUndefined();
  });
});
