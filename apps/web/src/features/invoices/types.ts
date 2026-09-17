import type {
  InvoiceListItemResponse,
  InvoiceResponse,
  InvoiceStatus,
  IssueResponse,
  IssueSeverity,
} from "@invoice-agent/shared";

export type Invoice = InvoiceResponse;
export type InvoiceListItem = InvoiceListItemResponse;
export type InvoiceIssue = IssueResponse;
export type { InvoiceStatus };

export type UpdateInvoiceInput = {
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string | null;
  currency?: string;
  subtotal?: string;
  vat?: string;
  total?: string;
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  needs_review: "Needs review",
  approved: "Approved",
  failed: "Failed",
};

export function statusLabel(status: InvoiceStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusBadgeVariant(
  status: InvoiceStatus,
): "secondary" | "info" | "warning" | "success" | "destructive" {
  switch (status) {
    case "uploaded":
      return "secondary";
    case "processing":
      return "info";
    case "needs_review":
      return "warning";
    case "approved":
      return "success";
    case "failed":
      return "destructive";
  }
}

const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function sortIssues(issues: InvoiceIssue[]): InvoiceIssue[] {
  return [...issues].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

export function issueFieldKeys(issues: InvoiceIssue[]): Set<string> {
  const keys = new Set<string>();
  for (const issue of issues) {
    if (issue.field) {
      keys.add(issue.field);
    }
  }
  return keys;
}
