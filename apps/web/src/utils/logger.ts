// apps/web/src/utils/logger.ts
import { createRequire } from "node:module";
import pino from "pino";
import { PII_REDACT_PATHS } from "@core/pii/redact";

const require = createRequire(import.meta.url);

const level =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

// Pretty nur als Stream (KEIN pino.transport / worker)
const enablePretty =
  process.env.LOG_PRETTY === "1" && process.env.NODE_ENV !== "production";

function buildLogger() {
  const baseOptions: pino.LoggerOptions = {
    level,
    base: undefined,
    redact: {
      paths: [...PII_REDACT_PATHS, "user.mfaSecret"],
      censor: "***",
    },
  };

  if (enablePretty) {
    try {
      const pretty = require("pino-pretty");
      const stream = pretty({
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      });
      return pino(baseOptions, stream);
    } catch (err) {
      console.warn("[logger] pino-pretty unavailable; using JSON logs", err);
    }
  }

  return pino(baseOptions);
}

export const logger = buildLogger();
export default logger;
