export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_STATE"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown): AppError {
  return new AppError("BAD_REQUEST", message, 400, details);
}

export function notFound(message: string): AppError {
  return new AppError("NOT_FOUND", message, 404);
}

export function conflict(message: string, details?: unknown): AppError {
  return new AppError("CONFLICT", message, 409, details);
}

export function validationError(message: string, details?: unknown): AppError {
  return new AppError("VALIDATION_ERROR", message, 422, details);
}

export function invalidState(message: string): AppError {
  return new AppError("INVALID_STATE", message, 409);
}

export function unsupportedMediaType(message: string): AppError {
  return new AppError("UNSUPPORTED_MEDIA_TYPE", message, 415);
}

export function payloadTooLarge(message: string): AppError {
  return new AppError("PAYLOAD_TOO_LARGE", message, 413);
}

export function idempotencyConflict(message: string): AppError {
  return new AppError("IDEMPOTENCY_CONFLICT", message, 409);
}

export function internalError(message = "Internal server error"): AppError {
  return new AppError("INTERNAL_ERROR", message, 500);
}

export function serviceUnavailable(message: string): AppError {
  return new AppError("SERVICE_UNAVAILABLE", message, 503);
}
