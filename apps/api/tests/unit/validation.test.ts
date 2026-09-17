import { describe, expect, it } from "vitest";
import type { ExtractedInvoice } from "@invoice-agent/shared";
import {
  hasBlockingIssues,
  validateExtractedInvoice,
} from "../../src/modules/invoices/invoice.validation.js";
import { finnishExtracted } from "../fixtures/finnish-invoice.js";

const noDuplicate = async () => false;

function withOverrides(
  overrides: Partial<ExtractedInvoice>,
): ExtractedInvoice {
  return {
    ...finnishExtracted,
    ...overrides,
    lineItems: overrides.lineItems ?? [...finnishExtracted.lineItems],
  };
}

describe("invoice validation", () => {
  it("accepts a valid Finnish EUR invoice", async () => {
    const issues = await validateExtractedInvoice(finnishExtracted, noDuplicate);
    expect(issues).toEqual([]);
    expect(hasBlockingIssues(issues)).toBe(false);
  });

  it("flags missing required fields as blocking errors", async () => {
    const issues = await validateExtractedInvoice(
      withOverrides({
        vendorName: " ",
        invoiceNumber: "",
        currency: "  ",
        lineItems: [],
      }),
      noDuplicate,
    );
    const codes = issues.map((i) => i.code);
    expect(codes).toContain("MISSING_VENDOR");
    expect(codes).toContain("MISSING_INVOICE_NUMBER");
    expect(codes).toContain("MISSING_CURRENCY");
    expect(codes).toContain("MISSING_LINE_ITEMS");
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("flags TOTAL_MISMATCH when subtotal+vat differs beyond tolerance", async () => {
    const issues = await validateExtractedInvoice(
      withOverrides({ total: "999.00" }),
      noDuplicate,
    );
    const mismatch = issues.find((i) => i.code === "TOTAL_MISMATCH");
    expect(mismatch).toMatchObject({
      severity: "warning",
      field: "total",
    });
    expect(hasBlockingIssues(issues)).toBe(false);
  });

  it("allows totals within moneyEquals tolerance", async () => {
    const issues = await validateExtractedInvoice(
      withOverrides({ total: "124.004" }),
      noDuplicate,
    );
    expect(issues.some((i) => i.code === "TOTAL_MISMATCH")).toBe(false);
  });

  it("flags LINE_ITEM_MISMATCH when line amounts do not sum to subtotal", async () => {
    const issues = await validateExtractedInvoice(
      withOverrides({
        subtotal: "100.00",
        vat: "0.00",
        total: "100.00",
        lineItems: [
          {
            description: "Ohjelmistokehitys",
            quantity: "1",
            unitPrice: "50.00",
            amount: "50.00",
          },
        ],
      }),
      noDuplicate,
    );
    const mismatch = issues.find((i) => i.code === "LINE_ITEM_MISMATCH");
    expect(mismatch).toMatchObject({
      severity: "warning",
      field: "subtotal",
    });
  });

  it("flags negative amounts as blocking", async () => {
    const issues = await validateExtractedInvoice(
      withOverrides({
        subtotal: "-10.00",
        vat: "0.00",
        total: "-10.00",
        lineItems: [
          {
            description: "Hyvitys",
            quantity: "1",
            unitPrice: "-10.00",
            amount: "-10.00",
          },
        ],
      }),
      noDuplicate,
    );
    expect(issues.filter((i) => i.code === "NEGATIVE_AMOUNT").length).toBeGreaterThan(0);
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("flags invalid money strings", async () => {
    const issues = await validateExtractedInvoice(
      withOverrides({
        subtotal: "abc",
        vat: "24.00",
        total: "124.00",
      }),
      noDuplicate,
    );
    expect(issues.some((i) => i.code === "INVALID_AMOUNTS")).toBe(true);
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("flags missing or invalid invoice date", async () => {
    const missing = await validateExtractedInvoice(
      withOverrides({ invoiceDate: "2024-02-30" }),
      noDuplicate,
    );
    expect(missing.some((i) => i.code === "MISSING_INVOICE_DATE")).toBe(true);
    expect(hasBlockingIssues(missing)).toBe(true);
  });

  it("flags due date before invoice date", async () => {
    const issues = await validateExtractedInvoice(
      withOverrides({
        invoiceDate: "2024-03-15",
        dueDate: "2024-03-01",
      }),
      noDuplicate,
    );
    const dateIssue = issues.find((i) => i.code === "INVALID_DATES");
    expect(dateIssue).toMatchObject({
      severity: "error",
      field: "dueDate",
    });
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("flags duplicate vendor + invoice_number as blocking", async () => {
    const issues = await validateExtractedInvoice(
      finnishExtracted,
      async () => true,
      "inv-exclude",
    );
    const dup = issues.find((i) => i.code === "DUPLICATE_INVOICE");
    expect(dup).toMatchObject({
      severity: "error",
      field: "invoiceNumber",
    });
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("passes excludeInvoiceId into the duplicate checker", async () => {
    let seen: unknown;
    await validateExtractedInvoice(
      finnishExtracted,
      async (lookup) => {
        seen = lookup;
        return false;
      },
      "inv-exclude",
    );
    expect(seen).toEqual({
      vendorName: "Dev Services Oy",
      invoiceNumber: "FI-2024-001",
      excludeInvoiceId: "inv-exclude",
    });
  });
});
