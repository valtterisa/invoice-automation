import { describe, expect, it } from "vitest";
import { extractedInvoiceSchema, lineItemSchema } from "./schemas.js";

const validLine = {
  description: "Consulting",
  quantity: "1",
  unitPrice: "100.00",
  amount: "100.00",
};

const validInvoice = {
  vendorName: "Acme Oy",
  invoiceNumber: "INV-1",
  invoiceDate: "2026-01-15",
  dueDate: "2026-02-15",
  currency: "EUR",
  subtotal: "100.00",
  vat: "24.00",
  total: "124.00",
  lineItems: [validLine],
};

describe("extracted invoice money shape", () => {
  it("accepts decimal strings on money fields", () => {
    expect(extractedInvoiceSchema.safeParse(validInvoice).success).toBe(true);
    expect(
      extractedInvoiceSchema.safeParse({
        ...validInvoice,
        subtotal: "100",
        vat: "0.5",
        total: "-1.2345",
      }).success,
    ).toBe(true);
  });

  it("rejects non-decimal money values", () => {
    for (const bad of ["", "12.34567", "1.", ".5", "1,00", "EUR", "1e2", " 1 "]) {
      expect(
        extractedInvoiceSchema.safeParse({ ...validInvoice, total: bad }).success,
        bad,
      ).toBe(false);
    }
  });

  it("rejects numeric money values (must be strings)", () => {
    expect(
      extractedInvoiceSchema.safeParse({ ...validInvoice, total: 124 }).success,
    ).toBe(false);
    expect(lineItemSchema.safeParse({ ...validLine, amount: 100 }).success).toBe(
      false,
    );
  });
});
