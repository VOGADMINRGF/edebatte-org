// packages/core/observability/logger.ts
import pino from "pino";
import { PII_REDACT_PATHS } from "../pii/redact";

import { createRequire } from "node:module";

const getRequire = () => createRequire(import.meta.url);

const enablePretty =
  process.env.LOG_PRETTY === "1" && process.env.NODE_ENV !== "production";

function buildFallbackLogger() {
  const formatArgs = (args: unknown[]) => {
    if (args.length <= 1) return args;
    if (typeof args[0] === "string") return args;
    if (typeof args[1] === "string") return [args[1], args[0]];
    return args;
  };

  const wrap = (fn: (...args: any[]) => void) => (...args: any[]) =>
    fn(...formatArgs(args));

  return {
    info: wrap(console.log),
    warn: wrap(console.warn),
    error: wrap(console.error),
    debug: wrap(console.debug),
  } as pino.Logger;
}

function buildLogger() {
  try {
    const baseOptions: pino.LoggerOptions = {
      level: process.env.LOG_LEVEL ?? "info",
      redact: {
        paths: [...PII_REDACT_PATHS],
        censor: "***",
      },
      base: { service: "VOG" },
    };

    if (enablePretty) {
      try {
        const pretty = getRequire()("pino-pretty");
        const stream = pretty({
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        });
        return pino(baseOptions, stream);
      } catch {
        if (process.env.NODE_ENV === "development") {
          console.warn("[logger] pino-pretty missing, falling back to JSON logs");
        }
      }
    }

    return pino(baseOptions);
  } catch (err) {
    console.warn("[logger] failed to initialize pino; using console logger", err);
    return buildFallbackLogger();
  }
}

export const logger = buildLogger();
