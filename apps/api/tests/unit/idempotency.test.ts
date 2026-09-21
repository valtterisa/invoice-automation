import { describe, expect, it } from "vitest";
import {
  assertIdempotencyMatch,
  buildIdempotencyScope,
  computeIdempotencyExpiresAt,
  hashRequestPayload,
  isIdempotencyExpired,
  requireIdempotencyKey,
} from "../../src/shared/idempotency/index.js";
import { AppError } from "../../src/shared/errors/index.js";

const futureExpiry = () => new Date(Date.now() + 60_000);
const pastExpiry = () => new Date(Date.now() - 60_000);

describe("idempotency helpers", () => {
  it("builds scopes and stable hashes", () => {
    expect(buildIdempotencyScope("process", "inv-1")).toBe("process:inv-1");
    expect(buildIdempotencyScope("approve", "inv-1")).toBe("approve:inv-1");
    expect(hashRequestPayload({ invoiceId: "inv-1" })).toEqual(
      hashRequestPayload({ invoiceId: "inv-1" }),
    );
    expect(hashRequestPayload({ invoiceId: "inv-1" })).not.toEqual(
      hashRequestPayload({ invoiceId: "inv-2" }),
    );
  });

  it("requires a non-empty key within length limits", () => {
    expect(() => requireIdempotencyKey(undefined)).toThrow(AppError);
    expect(() => requireIdempotencyKey("")).toThrow(AppError);
    expect(() => requireIdempotencyKey("   ")).toThrow(AppError);
    expect(() => requireIdempotencyKey("x".repeat(129))).toThrow(AppError);
    expect(requireIdempotencyKey(" key-1 ")).toBe("key-1");
  });

  it("computes expiry from TTL and detects expired records", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    expect(computeIdempotencyExpiresAt(createdAt, 3600).toISOString()).toBe(
      "2026-01-01T01:00:00.000Z",
    );
    expect(isIdempotencyExpired(pastExpiry())).toBe(true);
    expect(isIdempotencyExpired(futureExpiry())).toBe(false);
  });

  it("throws IDEMPOTENCY_CONFLICT when payload hash differs", () => {
    try {
      assertIdempotencyMatch(
        {
          key: "k",
          scope: "approve:inv-1",
          requestHash: "aaa",
          responseStatus: 200,
          responseBody: {},
          createdAt: new Date(),
          expiresAt: futureExpiry(),
        },
        "bbb",
      );
      expect.unreachable("expected conflict");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err).toMatchObject({
        code: "IDEMPOTENCY_CONFLICT",
        status: 409,
      });
    }
  });

  it("allows matching hashes", () => {
    expect(() =>
      assertIdempotencyMatch(
        {
          key: "k",
          scope: "process:inv-1",
          requestHash: "same",
          responseStatus: 200,
          responseBody: { ok: true },
          createdAt: new Date(),
          expiresAt: futureExpiry(),
        },
        "same",
      ),
    ).not.toThrow();
  });
});
