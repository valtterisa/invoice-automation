import type { Response } from "express";
import type { ErrorCode } from "../errors/index.js";

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details?: unknown | undefined;
  };
};

export function sendJson<T>(res: Response, status: number, body: T): void {
  res.status(status).json(body);
}

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: unknown,
): void {
  sendJson<ApiErrorBody>(res, status, {
    error: {
      code,
      message,
      requestId,
      details,
    },
  });
}
