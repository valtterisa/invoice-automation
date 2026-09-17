import type { CorsOptions } from "cors";

export function createCorsOptions(origins: readonly string[]): CorsOptions {
  return {
    origin: origins.length > 0 ? [...origins] : false,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Idempotency-Key", "X-Request-Id"],
    maxAge: 86400,
    optionsSuccessStatus: 204,
  };
}
