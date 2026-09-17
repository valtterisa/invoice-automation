import pino from "pino";
import { getConfig } from "../shared/config/index.js";

const config = getConfig();

const baseOptions = {
  level: config.LOG_LEVEL,
  base: { service: "invoice-agent-api" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers['x-api-key']",
      "headers.authorization",
      "headers['x-api-key']",
      "apiKey",
      "ANTHROPIC_API_KEY",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_ACCESS_KEY_ID",
      "DATABASE_URL",
      "document",
      "content",
      "fileBuffer",
      "extractionRaw",
      "body",
      "pdf",
    ],
    remove: true as const,
  },
};

export const logger = pino(
  config.NODE_ENV === "development"
    ? {
        ...baseOptions,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : baseOptions,
);

export type Logger = typeof logger;
