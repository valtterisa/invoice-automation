export const INVOICE_STATUSES = [
  "uploaded",
  "processing",
  "needs_review",
  "approved",
  "failed",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_TASK_STATUSES = ["pending", "completed"] as const;

export type PaymentTaskStatus = (typeof PAYMENT_TASK_STATUSES)[number];
