import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { parseCorsOrigins } from "../../src/shared/config/index.js";
import { createCorsOptions } from "../../src/shared/http/cors.js";
import type { Db } from "../../src/infrastructure/db/client.js";
import type { ObjectStorage } from "../../src/infrastructure/storage/s3.js";
import type { InvoiceExtractor } from "../../src/infrastructure/ai/invoice-extractor.js";

const originalCorsOrigin = process.env.CORS_ORIGIN;

afterEach(() => {
  if (originalCorsOrigin === undefined) {
    delete process.env.CORS_ORIGIN;
  } else {
    process.env.CORS_ORIGIN = originalCorsOrigin;
  }
});

function testApp() {
  return createApp({
    db: {} as Db,
    storage: {
      putPdf: async () => ({ key: "k", bucket: "b" }),
      getSignedGetUrl: async () => "https://example.com",
      getObjectBuffer: async () => Buffer.from(""),
    } satisfies ObjectStorage,
    extractor: {
      extractFromPdf: async () => {
        throw new Error("not used");
      },
    } satisfies InvoiceExtractor,
  });
}

describe("parseCorsOrigins", () => {
  it("defaults to local Vite in non-production when unset", () => {
    expect(parseCorsOrigins(undefined, "development")).toEqual([
      "http://localhost:5173",
    ]);
    expect(parseCorsOrigins(undefined, "test")).toEqual([
      "http://localhost:5173",
    ]);
  });

  it("defaults to no origins in production when unset", () => {
    expect(parseCorsOrigins(undefined, "production")).toEqual([]);
  });

  it("treats empty string as no origins", () => {
    expect(parseCorsOrigins("", "production")).toEqual([]);
    expect(parseCorsOrigins("", "development")).toEqual([]);
  });

  it("parses comma-separated origins", () => {
    expect(
      parseCorsOrigins(
        "https://app.vercel.app, https://invoice.example.com",
        "production",
      ),
    ).toEqual(["https://app.vercel.app", "https://invoice.example.com"]);
  });
});

describe("createCorsOptions", () => {
  it("disables CORS when no origins are configured", () => {
    expect(createCorsOptions([])).toMatchObject({ origin: false });
  });

  it("allows configured origins and custom headers", () => {
    expect(createCorsOptions(["https://app.vercel.app"])).toMatchObject({
      origin: ["https://app.vercel.app"],
      allowedHeaders: ["Content-Type", "Idempotency-Key", "X-Request-Id"],
    });
  });
});

describe("CORS middleware", () => {
  it("reflects an allowed origin and preflight headers", async () => {
    process.env.CORS_ORIGIN = "https://app.vercel.app";
    const origin = "https://app.vercel.app";

    const preflight = await request(testApp())
      .options("/api/invoices")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,idempotency-key");

    expect(preflight.status).toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBe(origin);
    expect(preflight.headers["access-control-allow-headers"]).toMatch(
      /idempotency-key/i,
    );

    const get = await request(testApp())
      .get("/health")
      .set("Origin", origin);

    expect(get.status).toBe(200);
    expect(get.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("does not allow a disallowed origin", async () => {
    process.env.CORS_ORIGIN = "https://app.vercel.app";

    const res = await request(testApp())
      .get("/health")
      .set("Origin", "https://evil.example");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
