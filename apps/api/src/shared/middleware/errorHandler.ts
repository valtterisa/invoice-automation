import type { NextFunction, Request, Response } from "express";
import { logger } from "../../infrastructure/logger.js";
import { AppError } from "../errors/index.js";
import { sendError } from "../http/index.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? "unknown";

  if (err instanceof AppError) {
    const fields = {
      err,
      request_id: requestId,
      error_code: err.code,
      operation: "http",
      method: req.method,
      path: req.path,
      status: err.status,
    };
    if (err.status >= 500) {
      logger.error(fields, err.message);
    } else {
      logger.warn(fields, err.message);
    }
    sendError(
      res,
      err.status,
      err.code,
      err.message,
      requestId,
      err.details,
    );
    return;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "LIMIT_FILE_SIZE"
  ) {
    logger.warn(
      {
        request_id: requestId,
        error_code: "PAYLOAD_TOO_LARGE",
        operation: "upload",
        method: req.method,
        path: req.path,
        status: 413,
      },
      "Uploaded file exceeds size limit",
    );
    sendError(
      res,
      413,
      "PAYLOAD_TOO_LARGE",
      "Uploaded file exceeds size limit",
      requestId,
    );
    return;
  }

  logger.error(
    {
      err,
      request_id: requestId,
      error_code: "INTERNAL_ERROR",
      operation: "http",
      method: req.method,
      path: req.path,
      status: 500,
    },
    "Unhandled error",
  );
  sendError(res, 500, "INTERNAL_ERROR", "Internal server error", requestId);
}
