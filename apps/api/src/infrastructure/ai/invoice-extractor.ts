import {
  extractedInvoiceSchema,
  type ExtractedInvoice,
} from "@invoice-agent/shared";
import { getAnthropicClient } from "./anthropic.js";
import { logger } from "../logger.js";
import { getConfig } from "../../shared/config/index.js";

export type { ExtractedInvoice };
export { extractedInvoiceSchema };

export type InvoiceExtractor = {
  extractFromPdf: (pdfBytes: Buffer) => Promise<ExtractedInvoice>;
};

export type ClaudeMessageClient = {
  create: (params: {
    model: string;
    max_tokens: number;
    messages: unknown[];
  }) => Promise<{ content: Array<{ type: string; text?: string }> }>;
};

const EXTRACTION_PROMPT = `Extract invoice fields from the attached PDF.
Return ONLY valid JSON with this shape:
{
  "vendorName": string,
  "invoiceNumber": string,
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD" | null,
  "currency": "USD" | "EUR" | ...,
  "subtotal": string decimal,
  "vat": string decimal,
  "total": string decimal,
  "lineItems": [{ "description": string, "quantity": string, "unitPrice": string, "amount": string }]
}
Use decimal strings for all money and quantity fields. Do not invent missing required fields.`;

export const MOCK_EXTRACTED_INVOICE: ExtractedInvoice = {
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
};

function extractJsonPayload(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? text.trim();
  return JSON.parse(candidate) as unknown;
}

export function createMockInvoiceExtractor(): InvoiceExtractor {
  return {
    async extractFromPdf(_pdfBytes) {
      return { ...MOCK_EXTRACTED_INVOICE, lineItems: [...MOCK_EXTRACTED_INVOICE.lineItems] };
    },
  };
}

export function createInvoiceExtractor(
  createMessage: ClaudeMessageClient["create"],
): InvoiceExtractor {
  return {
    async extractFromPdf(pdfBytes) {
      const response = await createMessage({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBytes.toString("base64"),
                },
              },
              {
                type: "text",
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((c) => c.type === "text");
      if (!textBlock || typeof textBlock.text !== "string") {
        throw new Error("Claude returned no text content");
      }

      let parsed: unknown;
      try {
        parsed = extractJsonPayload(textBlock.text);
      } catch {
        logger.warn(
          { operation: "extract", error_code: "MALFORMED_EXTRACTION_JSON" },
          "Malformed Claude JSON payload",
        );
        throw new Error("Malformed extraction JSON from model");
      }

      const validated = extractedInvoiceSchema.safeParse(parsed);
      if (!validated.success) {
        throw new Error(
          `Extraction schema validation failed: ${validated.error.message}`,
        );
      }
      return validated.data;
    },
  };
}

export function createDefaultInvoiceExtractor(): InvoiceExtractor {
  if (getConfig().ANTHROPIC_MOCK) {
    logger.info({ operation: "extract" }, "Using ANTHROPIC_MOCK invoice extractor");
    return createMockInvoiceExtractor();
  }

  const anthropic = getAnthropicClient();
  return createInvoiceExtractor(async (params) => {
    const result = await anthropic.messages.create(
      params as Parameters<typeof anthropic.messages.create>[0],
    );
    return result as { content: Array<{ type: string; text?: string }> };
  });
}
