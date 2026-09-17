import { z } from "zod";

const decimalStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,4})?$/, "Invalid decimal string");

export const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: decimalStringSchema,
  unitPrice: decimalStringSchema,
  amount: decimalStringSchema,
});

export type ExtractedLineItem = z.infer<typeof lineItemSchema>;

export const extractedInvoiceSchema = z.object({
  vendorName: z.string().min(1),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().min(1),
  dueDate: z.string().nullable(),
  currency: z.string().min(1).max(3),
  subtotal: decimalStringSchema,
  vat: decimalStringSchema,
  total: decimalStringSchema,
  lineItems: z.array(lineItemSchema),
});

export type ExtractedInvoice = z.infer<typeof extractedInvoiceSchema>;
