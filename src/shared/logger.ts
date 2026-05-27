import { LOG_PREFIX } from "./constants";

type LogLevel = "debug" | "info" | "warn" | "error";

export function log(level: LogLevel, scope: string, message: string, data?: unknown): void {
  const line = `${LOG_PREFIX} ${scope}: ${message}`;
  if (data === undefined) {
    console[level](line);
    return;
  }
  console[level](line, data);
}

export const logger = {
  debug: (scope: string, message: string, data?: unknown) => log("debug", scope, message, data),
  info: (scope: string, message: string, data?: unknown) => log("info", scope, message, data),
  warn: (scope: string, message: string, data?: unknown) => log("warn", scope, message, data),
  error: (scope: string, message: string, data?: unknown) => log("error", scope, message, data)
};
