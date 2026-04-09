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

interface JobStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  result?: IngestionResponse;
  error?: string;
  createdAt: number;
}

const jobsStore = new Map<string, JobStatus>();

export async function ingestHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const startTime = Date.now();
  const isAsync = req.query?.async === "true";

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

    if (isAsync) {
      jobsStore.set(jobId, {
        jobId,
        status: "pending",
        createdAt: Date.now(),
      });

      // Process in background
      processIngest(req, jobId, startTime, idempotencyKey, requestHash).catch(
        console.error,
      );

      res.status(202).json({
        jobId,
        status: "accepted",
        pollUrl: `/job/${jobId}`,
      });
      return;
    }

    const response = await processIngest(
      req,
      jobId,
      startTime,
      idempotencyKey,
      requestHash,
    );
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const statusCode = (error as any).statusCode || 422;
    res.status(statusCode).json({
      error: "Failed to process input",
      details: message,
    });
  }
}

async function processIngest(
  req: Request,
  jobId: string,
  startTime: number,
  idempotencyKey?: string,
  requestHash?: string,
): Promise<IngestionResponse> {
  try {
    if (jobsStore.has(jobId)) {
      jobsStore.get(jobId)!.status = "processing";
    }

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
      const error = new Error("No file or data provided");
      (error as any).statusCode = 400;
      throw error;
    }

    if (parsedData.rows.length === 0) {
      throw new Error("No records found in input");
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

    if (idempotencyKey && requestHash) {
      idempotencyStore.set({
        key: idempotencyKey,
        requestHash,
        response,
        createdAt: Date.now(),
      });
    }

    if (jobsStore.has(jobId)) {
      jobsStore.set(jobId, {
        ...jobsStore.get(jobId)!,
        status: "completed",
        result: response,
      });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (jobsStore.has(jobId)) {
      jobsStore.set(jobId, {
        ...jobsStore.get(jobId)!,
        status: "failed",
        error: message,
      });
    }
    throw error;
  }
}

export async function jobStatusHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const { jobId } = req.params;
  const job = jobsStore.get(jobId);

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(job);
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
