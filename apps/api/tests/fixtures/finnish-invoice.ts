import type { ExtractedInvoice } from "@invoice-agent/shared";
import type {
  InvoiceDto,
  PaymentTaskDto,
} from "../../src/modules/invoices/invoice.types.js";

export const finnishExtracted: ExtractedInvoice = {
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

export function makeInvoiceDto(
  overrides: Partial<InvoiceDto> = {},
): InvoiceDto {
  return {
    id: "inv-fi-1",
    status: "needs_review",
    fileKey: "invoices/inv-fi-1.pdf",
    storageKey: "invoices/inv-fi-1.pdf",
    originalFilename: "dev-services-oy-invoice.pdf",
    mimeType: "application/pdf",
    fileSize: 4096,
    vendorName: "Dev Services Oy",
    invoiceNumber: "FI-2024-001",
    invoiceDate: "2024-03-01",
    dueDate: "2024-03-31",
    currency: "EUR",
    subtotal: "100.0000",
    vat: "24.0000",
    total: "124.0000",
    failureReason: null,
    lineItems: [
      {
        id: "line-1",
        lineNumber: 1,
        description: "Ohjelmistokehitys",
        quantity: "1.0000",
        unitPrice: "100.0000",
        amount: "100.0000",
      },
    ],
    issues: [],
    createdAt: "2024-03-01T10:00:00.000Z",
    updatedAt: "2024-03-01T10:00:00.000Z",
    ...overrides,
  };
}

export function makePaymentTaskDto(
  overrides: Partial<PaymentTaskDto> = {},
): PaymentTaskDto {
  return {
    id: "pt-fi-1",
    invoiceId: "inv-fi-1",
    vendorName: "Dev Services Oy",
    amount: "124.0000",
    currency: "EUR",
    dueDate: "2024-03-31",
    status: "pending",
    createdAt: "2024-03-01T10:05:00.000Z",
    ...overrides,
  };
}
