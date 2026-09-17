import type {
  InvoiceStatus,
  IssueSeverity,
  IssueType,
  PaymentTaskStatus,
} from "@invoice-agent/shared";

export type { InvoiceStatus, IssueSeverity, IssueType, PaymentTaskStatus };

export type InvoiceIssueDto = {
  id: string;
  code: IssueType;
  message: string;
  severity: IssueSeverity;
  field?: string | null;
};

export type InvoiceLineItemDto = {
  id: string;
  lineNumber: number;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
};

export type InvoiceDto = {
  id: string;
  status: InvoiceStatus;
  fileKey: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: string | null;
  subtotal: string | null;
  vat: string | null;
  total: string | null;
  failureReason: string | null;
  lineItems: InvoiceLineItemDto[];
  issues: InvoiceIssueDto[];
  createdAt: string;
  updatedAt: string;
};

export type InvoiceListItemDto = {
  id: string;
  status: InvoiceStatus;
  originalFilename: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  total: string | null;
  currency: string | null;
  createdAt: string;
};

export type PatchInvoiceInput = {
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string | null;
  currency?: string;
  subtotal?: string;
  vat?: string;
  total?: string;
};

export type ValidationIssue = {
  code: IssueType;
  message: string;
  severity: IssueSeverity;
  field?: string | undefined;
};

export type PaymentTaskDto = {
  id: string;
  invoiceId: string;
  vendorName: string;
  amount: string;
  currency: string;
  dueDate: string | null;
  status: PaymentTaskStatus;
  createdAt: string;
};
