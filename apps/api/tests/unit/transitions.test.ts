import { describe, expect, it } from "vitest";
import type { InvoiceStatus } from "@invoice-agent/shared";
import {
  assertTransition,
  canTransition,
  getAllowedTransitions,
} from "../../src/modules/invoices/invoice.transitions.js";
import { AppError } from "../../src/shared/errors/index.js";

const ALL: InvoiceStatus[] = [
  "uploaded",
  "processing",
  "needs_review",
  "failed",
  "approved",
];

describe("invoice transitions", () => {
  it("allows only the defined happy-path edges", () => {
    expect(canTransition("uploaded", "processing")).toBe(true);
    expect(canTransition("processing", "needs_review")).toBe(true);
    expect(canTransition("processing", "failed")).toBe(true);
    expect(canTransition("needs_review", "approved")).toBe(true);
    expect(getAllowedTransitions("uploaded")).toEqual(["processing"]);
    expect(getAllowedTransitions("processing")).toEqual([
      "needs_review",
      "failed",
    ]);
    expect(getAllowedTransitions("needs_review")).toEqual(["approved"]);
  });

  it("rejects approving an uploaded invoice", () => {
    expect(canTransition("uploaded", "approved")).toBe(false);
    expect(() => assertTransition("uploaded", "approved")).toThrow(AppError);
    expect(() => assertTransition("uploaded", "approved")).toThrow(
      /uploaded.*approved/i,
    );
  });

  it("rejects re-processing approved or failed invoices", () => {
    expect(canTransition("approved", "processing")).toBe(false);
    expect(canTransition("failed", "processing")).toBe(false);
    expect(getAllowedTransitions("approved")).toEqual([]);
    expect(getAllowedTransitions("failed")).toEqual([]);
    expect(() => assertTransition("approved", "processing")).toThrow(
      AppError,
    );
  });

  it("rejects all other illegal transitions including self-transitions", () => {
    const allowed = new Set([
      "uploaded->processing",
      "processing->needs_review",
      "processing->failed",
      "needs_review->approved",
    ]);

    for (const from of ALL) {
      for (const to of ALL) {
        const edge = `${from}->${to}`;
        if (allowed.has(edge)) {
          expect(canTransition(from, to)).toBe(true);
        } else {
          expect(canTransition(from, to)).toBe(false);
          expect(() => assertTransition(from, to)).toThrow(AppError);
        }
      }
    }
  });
});
