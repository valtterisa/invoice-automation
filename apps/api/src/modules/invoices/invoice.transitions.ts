import type { InvoiceStatus } from "@invoice-agent/shared";
import { invalidState } from "../../shared/errors/index.js";

const ALLOWED: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  uploaded: ["processing"],
  processing: ["needs_review", "failed"],
  needs_review: ["approved"],
  failed: [],
  approved: [],
};

export function canTransition(
  from: InvoiceStatus,
  to: InvoiceStatus,
): boolean {
  return ALLOWED[from].includes(to);
}

export function assertTransition(
  from: InvoiceStatus,
  to: InvoiceStatus,
): void {
  if (!canTransition(from, to)) {
    throw invalidState(`Cannot transition invoice from ${from} to ${to}`);
  }
}

export function getAllowedTransitions(
  from: InvoiceStatus,
): readonly InvoiceStatus[] {
  return ALLOWED[from];
}
