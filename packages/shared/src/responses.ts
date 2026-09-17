import type { IssueSeverity, IssueType } from "./issues.js";
import type { InvoiceStatus, PaymentTaskStatus } from "./statuses.js";

export interface LineItemResponse {
  id: string;
  lineNumber: number;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
}

export interface IssueResponse {
  id: string;
  code: IssueType;
  severity: IssueSeverity;
  message: string;
  field?: string | null;
}

export interface PaymentTaskResponse {
  id: string;
  invoiceId: string;
  vendorName: string;
  amount: string;
  currency: string;
  dueDate: string | null;
  status: PaymentTaskStatus;
  createdAt: string;
}

export interface InvoiceListItemResponse {
  id: string;
  status: InvoiceStatus;
  originalFilename: string;
  vendorName: string | null;
  invoiceNumber: string | null;
  total: string | null;
  currency: string | null;
  createdAt: string;
}

export interface InvoiceResponse {
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
  lineItems: LineItemResponse[];
  issues: IssueResponse[];
  paymentTask?: PaymentTaskResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFileResponse {
  url: string;
  expiresIn: number;
}

export interface InvoiceUploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
}

export interface InvoiceCreateFromStoredRequest {
  fileKey: string;
  originalFilename: string;
  fileSize: number;
}

export type InvoiceListResponse = InvoiceListItemResponse[];
