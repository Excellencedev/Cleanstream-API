import express from "express";
import multer from "multer";
import { config, validateConfig } from "./config.js";
import { logger } from "./logger.js";
import {
  authMiddleware,
  rateLimiter,
  requestLogger,
} from "./middleware/index.js";
import {
  ingestHandler,
  validateHandler,
  schemaDefineHandler,
  auditHandler,
} from "./handlers/index.js";

// Validate configuration
validateConfig();

const app = express();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize },
});

// Global middleware
app.disable("x-powered-by"); // Security: hide express signature
app.use(express.json({ limit: "10mb" })); // Reduced limit for better security
app.use(requestLogger);
app.use(rateLimiter);

// Health check (no auth required)
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.environment,
  });
});

// Readiness check for k8s
app.get("/ready", (_req, res) => {
  res.json({ ready: true });
});

// Protected routes
app.post("/ingest", authMiddleware, upload.single("file"), ingestHandler);
app.post("/validate", authMiddleware, validateHandler);
app.post("/schema/define", authMiddleware, schemaDefineHandler);
app.get("/audit/:jobId", authMiddleware, auditHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error("Unhandled error", { message: err.message, stack: err.stack });

    if (config.environment === "production") {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res
        .status(500)
        .json({ error: "Internal server error", details: err.message });
    }
  },
);

// Start server
const server = app.listen(config.port, () => {
  logger.info(`CleanStream API started`, {
    port: config.port,
    environment: config.environment,
  });

  if (config.environment !== "production") {
    console.log(`
🚀 CleanStream API running on http://localhost:${config.port}

Endpoints:
  POST /ingest        - Ingest and normalize data
  POST /validate      - Validate data against schema
  POST /schema/define - Define a target schema
  GET  /audit/:jobId  - Get job audit details
  GET  /health        - Health check
  GET  /ready         - Readiness check
    `);
  }
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });

  // Force shutdown after 30s
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
