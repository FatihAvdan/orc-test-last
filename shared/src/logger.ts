export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): LogLevel {
  return (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === "production" ? "info" : "debug");
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[getLogLevel()];
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

export const logger: Logger = {
  debug(message: string, meta?: unknown): void {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, meta));
    }
  },

  info(message: string, meta?: unknown): void {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, meta));
    }
  },

  warn(message: string, meta?: unknown): void {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, meta));
    }
  },

  error(message: string, meta?: unknown): void {
    if (shouldLog("error")) {
      console.error(formatMessage("error", message, meta));
    }
  },
};
