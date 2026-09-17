import type { PaymentTaskResponse, PaymentTaskStatus } from "@invoice-agent/shared";

export type PaymentTask = PaymentTaskResponse;

const STATUS_LABELS: Record<PaymentTaskStatus, string> = {
  pending: "Pending",
  completed: "Completed",
};

export function paymentTaskStatusLabel(status: PaymentTaskStatus): string {
  return STATUS_LABELS[status] ?? status;
}
