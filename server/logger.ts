import path from "path";
import { mkdirSync } from "fs";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// Same pkg-aware idiom already used for install-status.txt (server/index.ts)
// so logs land next to the exe in production and in the repo root in dev.
const logsDir = path.join(
  (process as any).pkg ? path.dirname(process.execPath) : process.cwd(),
  "logs",
);

try {
  mkdirSync(logsDir, { recursive: true });
} catch {
  // If this fails, winston's own transport will surface the real error on first write.
}

// No console transport here - initLogging() patches the global console
// methods to call this logger directly, so adding one here would print
// every line twice.
export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}] ${message}`),
  ),
  transports: [
    new DailyRotateFile({
      dirname: logsDir,
      filename: "app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      maxSize: "20m",
      zippedArchive: true,
    }),
  ],
});

function formatArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack || arg.message;
  }
  if (typeof arg === "string") {
    return arg;
  }
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

let initialized = false;

export function initLogging() {
  if (initialized) return;
  initialized = true;

  const original = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
    info: console.info.bind(console),
  };

  console.log = (...args: unknown[]) => {
    original.log(...args);
    logger.info(args.map(formatArg).join(" "));
  };
  console.info = (...args: unknown[]) => {
    original.info(...args);
    logger.info(args.map(formatArg).join(" "));
  };
  console.warn = (...args: unknown[]) => {
    original.warn(...args);
    logger.warn(args.map(formatArg).join(" "));
  };
  console.error = (...args: unknown[]) => {
    original.error(...args);
    logger.error(args.map(formatArg).join(" "));
  };

  process.on("uncaughtException", (err) => {
    logger.error(`Uncaught Exception: ${err.stack || err.message}`);
  });
  process.on("unhandledRejection", (reason) => {
    const message = reason instanceof Error ? (reason.stack || reason.message) : String(reason);
    logger.error(`Unhandled Rejection: ${message}`);
  });
}
