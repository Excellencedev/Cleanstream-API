import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  parseCSV,
  parseExcel,
  parseXML,
  parseJSON,
  type ParsedData,
} from "../parsers/index.js";
import { inferSchema } from "../inference/index.js";
import { normalizeRecords } from "../normalizer/index.js";
import type { IngestionResponse } from "../models/schema.js";
import { config } from "../config.js";
import { auditStore } from "./audit.js";
import { IngestionIdempotencyStore } from "../services/auditStore.js";

const idempotencyStore = new IngestionIdempotencyStore(config.idempotencyTtlMs);

export async function ingestHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const startTime = Date.now();

  try {
    const idempotencyKey = req.header("Idempotency-Key")?.trim();
    const requestHash = hashRequest(req);

    if (idempotencyKey) {
      const existing = idempotencyStore.get(idempotencyKey);

      if (existing) {
        if (existing.requestHash !== requestHash) {
          res.status(409).json({
            error:
              "Idempotency-Key already used with a different payload. Reuse only with identical requests.",
          });
          return;
        }

        res.setHeader("X-Idempotent-Replay", "true");
        res.json(existing.response);
        return;
      }
    }

    const jobId = uuidv4();
    let parsedData: ParsedData;

    // Handle file upload
    if (req.file) {
      const { buffer, mimetype, originalname } = req.file;
      parsedData = parseFile(buffer, mimetype, originalname);
    }
    // Handle JSON body
    else if (req.body && (req.body.data || Array.isArray(req.body))) {
      const content = JSON.stringify(req.body);
      parsedData = parseJSON(content);
    } else {
      res.status(400).json({ error: "No file or data provided" });
      return;
    }

    if (parsedData.rows.length === 0) {
      res.status(422).json({ error: "No records found in input" });
      return;
    }

    // Infer schema
    const schema = inferSchema(parsedData.headers, parsedData.rows);

    // Normalize records
    const { records, errors } = normalizeRecords(
      parsedData.rows,
      schema,
      parsedData.headers,
    );

    const processingTimeMs = Date.now() - startTime;

    const response: IngestionResponse = {
      jobId,
      schema: { fields: schema },
      records,
      errors,
      meta: {
        totalRecords: parsedData.rows.length,
        processedRecords: records.length,
        processingTimeMs,
      },
    };

    // Store audit record
    auditStore.set(jobId, {
      jobId,
      timestamp: new Date().toISOString(),
      recordsProcessed: records.length,
      errors,
      schema: { fields: schema },
      processingTimeMs,
    });

    if (idempotencyKey) {
      idempotencyStore.set({
        key: idempotencyKey,
        requestHash,
        response,
        createdAt: Date.now(),
      });
    }

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(422).json({
      error: "Failed to process input",
      details: message,
    });
  }
}

function parseFile(
  buffer: Buffer,
  mimetype: string,
  filename: string,
): ParsedData {
  const ext = filename.toLowerCase().split(".").pop() || "";

  if (mimetype === "text/csv" || ext === "csv") {
    return parseCSV(buffer);
  }

  if (
    mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    ext === "xlsx"
  ) {
    return parseExcel(buffer);
  }

  if (
    mimetype === "application/xml" ||
    mimetype === "text/xml" ||
    ext === "xml"
  ) {
    return parseXML(buffer);
  }

  if (mimetype === "application/json" || ext === "json") {
    return parseJSON(buffer);
  }

  throw new Error(`Unsupported file type: ${mimetype || ext}`);
}

function hashRequest(req: Request): string {
  const hash = createHash("sha256");
  hash.update(req.method);
  hash.update(req.originalUrl);

  if (req.file?.buffer) {
    hash.update(req.file.buffer);
    hash.update(req.file.mimetype);
    hash.update(req.file.originalname);
  } else {
    hash.update(JSON.stringify(req.body ?? {}));
  }

  return hash.digest("hex");
}
