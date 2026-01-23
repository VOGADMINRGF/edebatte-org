// apps/web/src/utils/logger.ts
import { createRequire } from "node:module";
import pino from "pino";
import { PII_REDACT_PATHS } from "@core/pii/redact";

const getRequire = () => {
  return createRequire(import.meta.url);
};

const level =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

// Pretty nur als Stream (KEIN pino.transport / worker)
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
      level,
      base: undefined,
      redact: {
        paths: [...PII_REDACT_PATHS, "user.mfaSecret"],
        censor: "***",
      },
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
      } catch (err) {
        console.warn("[logger] pino-pretty unavailable; using JSON logs", err);
      }
    }

    return pino(baseOptions);
  } catch (err) {
    console.warn("[logger] failed to initialize pino; using console logger", err);
    return buildFallbackLogger();
  }
}

export const logger = buildLogger();
export default logger;
