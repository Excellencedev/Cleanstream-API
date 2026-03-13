export interface Config {
  port: number;
  apiKeys: Set<string>;
  rateLimit: {
    windowMs: number;
    max: number;
  };
  maxFileSize: number;
  environment: "development" | "production" | "test";
  logLevel: "debug" | "info" | "warn" | "error";
  auditStoreFile: string;
  idempotencyTtlMs: number;
}

function getEnvVar(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function parseApiKeys(value: string): Set<string> {
  if (!value) return new Set(["test-api-key"]);
  return new Set(
    value
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
  );
}

export const config: Config = {
  port: getEnvNumber("PORT", 3000),
  apiKeys: parseApiKeys(
    getEnvVar("API_KEYS", getEnvVar("API_KEY", "test-api-key")),
  ),
  rateLimit: {
    windowMs: getEnvNumber("RATE_LIMIT_WINDOW_MS", 60000),
    max: getEnvNumber("RATE_LIMIT_MAX", 100),
  },
  maxFileSize: getEnvNumber("MAX_FILE_SIZE_MB", 50) * 1024 * 1024,
  environment: getEnvVar("NODE_ENV", "development") as Config["environment"],
  logLevel: getEnvVar("LOG_LEVEL", "info") as Config["logLevel"],
  auditStoreFile: getEnvVar("AUDIT_STORE_FILE", ".data/audit-store.json"),
  idempotencyTtlMs: getEnvNumber("IDEMPOTENCY_TTL_MS", 24 * 60 * 60 * 1000),
};

export function validateConfig(): void {
  if (
    config.environment === "production" &&
    config.apiKeys.has("test-api-key")
  ) {
    console.warn("⚠️  WARNING: Using default test API key in production!");
  }
}
