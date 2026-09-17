export type AppConfig = {
  PORT: number;
  NODE_ENV: "development" | "test" | "production";
  DATABASE_URL: string;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MOCK: boolean;
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  S3_BUCKET: string;
  S3_ENDPOINT: string;
  S3_FORCE_PATH_STYLE: boolean;
  LOG_LEVEL: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  UPLOAD_MAX_BYTES: number;
  CORS_ORIGINS: string[];
};

const LOG_LEVELS = new Set<AppConfig["LOG_LEVEL"]>([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

export function parseCorsOrigins(
  value: string | undefined,
  nodeEnv: AppConfig["NODE_ENV"],
): string[] {
  const raw =
    value !== undefined
      ? value
      : nodeEnv === "production"
        ? ""
        : "http://localhost:5173";

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function getConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV;
  const logLevel = process.env.LOG_LEVEL;
  const resolvedEnv: AppConfig["NODE_ENV"] =
    nodeEnv === "development" || nodeEnv === "test" || nodeEnv === "production"
      ? nodeEnv
      : "development";

  return {
    PORT: Number(process.env.PORT) || 3001,
    NODE_ENV: resolvedEnv,
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "mysql://invoice:invoice@127.0.0.1:3306/invoice_agent",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
    ANTHROPIC_MOCK: process.env.ANTHROPIC_MOCK === "true",
    AWS_REGION: process.env.AWS_REGION || "eu-north-1",
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
    S3_BUCKET: process.env.S3_BUCKET || "invoice-agent",
    S3_ENDPOINT: process.env.S3_ENDPOINT || "",
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE === "true",
    LOG_LEVEL:
      logLevel && LOG_LEVELS.has(logLevel as AppConfig["LOG_LEVEL"])
        ? (logLevel as AppConfig["LOG_LEVEL"])
        : "info",
    UPLOAD_MAX_BYTES: Number(process.env.UPLOAD_MAX_BYTES) || 10_485_760,
    CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGIN, resolvedEnv),
  };
}
