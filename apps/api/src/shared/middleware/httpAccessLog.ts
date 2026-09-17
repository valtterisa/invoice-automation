import type { NextFunction, Request, Response } from "express";
import { logger } from "../../infrastructure/logger.js";

function requestPath(req: Request): string {
  return req.originalUrl?.split("?")[0] ?? req.path;
}

export function httpAccessLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const started = process.hrtime.bigint();
  const path = requestPath(req);

  if (path === "/health" || path === "/ready") {
    next();
    return;
  }

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    const status = res.statusCode;
    const invoiceId = req.params["id"];
    const fields = {
      request_id: req.requestId,
      method: req.method,
      path,
      status,
      duration_ms: Math.round(durationMs * 100) / 100,
      operation: "http",
      invoice_id:
        typeof invoiceId === "string" && invoiceId.length > 0
          ? invoiceId
          : undefined,
    };

    if (status >= 500) {
      logger.error(fields, "request completed");
    } else if (status >= 400) {
      logger.warn(fields, "request completed");
    } else {
      logger.info(fields, "request completed");
    }
  });

  next();
}
