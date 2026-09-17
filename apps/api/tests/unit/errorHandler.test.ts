import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { errorHandler } from "../../src/shared/middleware/errorHandler.js";
import {
  AppError,
  badRequest,
  conflict,
  invalidState,
  notFound,
} from "../../src/shared/errors/index.js";

function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("AppError HTTP shape", () => {
  it("serializes AppError to consistent JSON", () => {
    const res = mockRes();
    const req = { requestId: "req-123", method: "POST", path: "/api/invoices/1/approve" } as Request;
    const next = vi.fn() as NextFunction;

    errorHandler(
      invalidState("Cannot transition invoice from uploaded to approved"),
      req,
      res,
      next,
    );

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({
      error: {
        code: "INVALID_STATE",
        message: "Cannot transition invoice from uploaded to approved",
        requestId: "req-123",
      },
    });
  });

  it("includes details when present", () => {
    const res = mockRes();
    const req = { requestId: "req-456", method: "PATCH", path: "/api/x" } as Request;

    errorHandler(
      badRequest("Invalid patch body", { field: "dueDate" }),
      req,
      res,
      vi.fn() as NextFunction,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid patch body",
        requestId: "req-456",
        details: { field: "dueDate" },
      },
    });
  });

  it("maps common domain errors to stable codes", () => {
    const cases: Array<{ err: AppError; status: number; code: string }> = [
      { err: notFound("Invoice missing"), status: 404, code: "NOT_FOUND" },
      { err: conflict("Payment task already exists"), status: 409, code: "CONFLICT" },
      {
        err: new AppError("IDEMPOTENCY_CONFLICT", "Key reuse", 409),
        status: 409,
        code: "IDEMPOTENCY_CONFLICT",
      },
    ];

    for (const { err, status, code } of cases) {
      const res = mockRes();
      errorHandler(
        err,
        { requestId: "r", method: "GET", path: "/" } as Request,
        res,
        vi.fn() as NextFunction,
      );
      expect(res.statusCode).toBe(status);
      expect((res.body as { error: { code: string } }).error.code).toBe(code);
    }
  });

  it("falls back to INTERNAL_ERROR for unknown errors", () => {
    const res = mockRes();
    errorHandler(
      new Error("boom"),
      { requestId: "req-500", method: "GET", path: "/" } as Request,
      res,
      vi.fn() as NextFunction,
    );

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        requestId: "req-500",
      },
    });
  });
});
