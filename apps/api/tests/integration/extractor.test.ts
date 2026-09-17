import { describe, expect, it, vi } from "vitest";
import {
  createInvoiceExtractor,
  createMockInvoiceExtractor,
  extractedInvoiceSchema,
  MOCK_EXTRACTED_INVOICE,
} from "../../src/infrastructure/ai/invoice-extractor.js";

describe("invoice extractor", () => {
  it("parses a valid Claude JSON payload", async () => {
    const extractor = createInvoiceExtractor(async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            vendorName: "Dev Services Oy",
            invoiceNumber: "FI-2024-001",
            invoiceDate: "2024-03-01",
            dueDate: "2024-03-31",
            currency: "EUR",
            subtotal: "100.00",
            vat: "24.00",
            total: "124.00",
            lineItems: [
              {
                description: "Ohjelmistokehitys",
                quantity: "1",
                unitPrice: "100.00",
                amount: "100.00",
              },
            ],
          }),
        },
      ],
    }));

    const result = await extractor.extractFromPdf(Buffer.from("%PDF"));
    expect(result.vendorName).toBe("Dev Services Oy");
    expect(result.currency).toBe("EUR");
    expect(extractedInvoiceSchema.safeParse(result).success).toBe(true);
  });

  it("parses fenced JSON from Claude text", async () => {
    const extractor = createInvoiceExtractor(async () => ({
      content: [
        {
          type: "text",
          text: `Here is the invoice:\n\`\`\`json\n${JSON.stringify(MOCK_EXTRACTED_INVOICE)}\n\`\`\``,
        },
      ],
    }));

    const result = await extractor.extractFromPdf(Buffer.from("%PDF"));
    expect(result).toEqual(MOCK_EXTRACTED_INVOICE);
  });

  it("rejects malformed JSON", async () => {
    const extractor = createInvoiceExtractor(async () => ({
      content: [{ type: "text", text: "not-json{" }],
    }));
    await expect(extractor.extractFromPdf(Buffer.from("%PDF"))).rejects.toThrow(
      /Malformed/,
    );
  });

  it("rejects schema-invalid payloads", async () => {
    const extractor = createInvoiceExtractor(async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({ vendorName: "Acme", lineItems: [] }),
        },
      ],
    }));
    await expect(extractor.extractFromPdf(Buffer.from("%PDF"))).rejects.toThrow(
      /schema validation failed/i,
    );
  });

  it("rejects responses with no text content", async () => {
    const extractor = createInvoiceExtractor(async () => ({
      content: [{ type: "tool_use" }],
    }));
    await expect(extractor.extractFromPdf(Buffer.from("%PDF"))).rejects.toThrow(
      /no text content/i,
    );
  });

  it("propagates Claude client timeouts/errors", async () => {
    const create = vi.fn(async () => {
      throw new Error("Request timed out");
    });
    const extractor = createInvoiceExtractor(create);
    await expect(extractor.extractFromPdf(Buffer.from("%PDF"))).rejects.toThrow(
      /timed out/i,
    );
  });
});

describe("ANTHROPIC_MOCK extractor", () => {
  it("returns deterministic Finnish EUR invoice data", async () => {
    const extractor = createMockInvoiceExtractor();
    const result = await extractor.extractFromPdf(Buffer.from("%PDF"));
    expect(result).toEqual(MOCK_EXTRACTED_INVOICE);
    expect(result.currency).toBe("EUR");
    expect(result.vendorName).toContain("Oy");
    expect(result.total).toBe("124.00");
  });
});
