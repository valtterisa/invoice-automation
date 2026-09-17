import { createHash } from "node:crypto";
import { badRequest, idempotencyConflict } from "../errors/index.js";

export type IdempotencyRecord = {
  key: string;
  scope: string;
  requestHash: string;
  responseStatus: number;
  responseBody: unknown;
  createdAt: Date;
};

export function buildIdempotencyScope(
  action: "process" | "approve",
  invoiceId: string,
): string {
  return `${action}:${invoiceId}`;
}

export function hashRequestPayload(payload: unknown): string {
  const serialized = JSON.stringify(payload ?? null);
  return createHash("sha256").update(serialized).digest("hex");
}

export function assertIdempotencyMatch(
  existing: IdempotencyRecord,
  requestHash: string,
): void {
  if (existing.requestHash !== requestHash) {
    throw idempotencyConflict(
      "Idempotency-Key was reused with a different request payload",
    );
  }
}

export function requireIdempotencyKey(headerValue: string | undefined): string {
  const key = headerValue?.trim();
  if (!key) {
    throw badRequest("Idempotency-Key header is required");
  }
  if (key.length > 128) {
    throw badRequest("Idempotency-Key is too long");
  }
  return key;
}
