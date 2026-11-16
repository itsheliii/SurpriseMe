// The ONLY way to log in the backend. Do not use console.log.
// RULE: log IDs only. Never log gift card codes, PINs, tokens, passwords,
// email addresses, phone numbers, or message text.
import { Logger } from "@aws-lambda-powertools/logger";

const BLOCKED_KEYS = [
  "code", "pin", "token", "password", "email", "phone",
  "text", "authorization",
];

// Safety net: hides risky fields if someone logs them by accident.
function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const lower = key.toLowerCase();
      clean[key] = BLOCKED_KEYS.some((b) => lower.includes(b))
        ? "[REDACTED]"
        : scrub(val);
    }
    return clean;
  }
  return value;
}

const base = new Logger({
  serviceName: "surpriseme",
  logLevel: (process.env.LOG_LEVEL as "DEBUG" | "INFO" | "WARN" | "ERROR") ?? "INFO",
});

export const logger = {
  info: (message: string, details: Record<string, unknown> = {}) =>
    base.info(message, scrub(details) as Record<string, unknown>),
  warn: (message: string, details: Record<string, unknown> = {}) =>
    base.warn(message, scrub(details) as Record<string, unknown>),
  error: (message: string, details: Record<string, unknown> = {}) =>
    base.error(message, scrub(details) as Record<string, unknown>),
};