import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import sqlite3 from "sqlite3";
import { promisify } from "node:util";
import type { AuditResponse, IngestionResponse } from "../models/schema.js";

export class PersistentAuditStore {
  private db: sqlite3.Database;

  constructor(private readonly storageFilePath: string) {
    if (storageFilePath !== ":memory:") {
      mkdirSync(dirname(this.storageFilePath), { recursive: true });
    }
    this.db = new sqlite3.Database(this.storageFilePath);
    this.init();
  }

  private init(): void {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS audits (
          jobId TEXT PRIMARY KEY,
          timestamp TEXT,
          recordsProcessed INTEGER,
          errors TEXT,
          schema_def TEXT,
          processingTimeMs INTEGER
        )
      `);
    });
  }

  async get(jobId: string): Promise<AuditResponse | undefined> {
    const get = promisify(
      (
        query: string,
        params: any[],
        cb: (err: Error | null, row: any) => void,
      ) => {
        this.db.get(query, params, cb);
      },
    );
    const row = (await get("SELECT * FROM audits WHERE jobId = ?", [
      jobId,
    ])) as any;
    if (!row) return undefined;

    return {
      jobId: row.jobId,
      timestamp: row.timestamp,
      recordsProcessed: row.recordsProcessed,
      errors: JSON.parse(row.errors),
      schema: JSON.parse(row.schema_def),
      processingTimeMs: row.processingTimeMs,
    };
  }

  async set(jobId: string, value: AuditResponse): Promise<void> {
    const run = promisify(
      (query: string, params: any[], cb: (err: Error | null) => void) => {
        this.db.run(query, params, cb);
      },
    );
    await run(
      `INSERT OR REPLACE INTO audits (jobId, timestamp, recordsProcessed, errors, schema_def, processingTimeMs)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        jobId,
        value.timestamp,
        value.recordsProcessed,
        JSON.stringify(value.errors),
        JSON.stringify(value.schema),
        value.processingTimeMs,
      ],
    );
  }

  async size(): Promise<number> {
    const get = promisify(
      (query: string, cb: (err: Error | null, row: any) => void) => {
        this.db.get(query, cb);
      },
    );
    const row = (await get("SELECT COUNT(*) as count FROM audits")) as any;
    return row.count;
  }
}

export interface IdempotencyRecord {
  key: string;
  requestHash: string;
  response: IngestionResponse;
  createdAt: number;
}

export class IngestionIdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): IdempotencyRecord | undefined {
    this.pruneExpired();
    return this.records.get(key);
  }

  set(record: IdempotencyRecord): void {
    this.pruneExpired();
    this.records.set(record.key, record);
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.records) {
      if (now - value.createdAt > this.ttlMs) {
        this.records.delete(key);
      }
    }
  }
}
