import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AuditResponse, IngestionResponse } from "../models/schema.js";

export class PersistentAuditStore {
  private readonly audits = new Map<string, AuditResponse>();

  constructor(private readonly storageFilePath?: string) {
    this.loadFromDisk();
  }

  get(jobId: string): AuditResponse | undefined {
    return this.audits.get(jobId);
  }

  set(jobId: string, value: AuditResponse): void {
    this.audits.set(jobId, value);
    this.persistToDisk();
  }

  size(): number {
    return this.audits.size;
  }

  private loadFromDisk(): void {
    if (!this.storageFilePath) {
      return;
    }

    try {
      const contents = readFileSync(this.storageFilePath, "utf-8");
      const data = JSON.parse(contents) as AuditResponse[];

      for (const audit of data) {
        if (audit?.jobId) {
          this.audits.set(audit.jobId, audit);
        }
      }
    } catch {
      // Ignore missing/corrupt state and start fresh.
    }
  }

  private persistToDisk(): void {
    if (!this.storageFilePath) {
      return;
    }

    mkdirSync(dirname(this.storageFilePath), { recursive: true });
    const data = JSON.stringify(Array.from(this.audits.values()));
    writeFileSync(this.storageFilePath, data, "utf-8");
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
