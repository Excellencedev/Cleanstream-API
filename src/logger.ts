import { config } from "./config.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.logLevel];
}

function formatMessage(
  level: LogLevel,
  message: string,
  meta?: object,
): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: object): void {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, meta));
    }
  },

  info(message: string, meta?: object): void {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, meta));
    }
  },

  warn(message: string, meta?: object): void {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, meta));
    }
  },

  error(message: string, meta?: object): void {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, meta));
    }
  },

  request(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
  ): void {
    const level =
      statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    this[level](`${method} ${path} ${statusCode}`, { durationMs });
  },
};
