import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaymentTask } from "../types";

export const paymentTaskKeys = {
  byInvoice: (invoiceId: string) => ["payment-tasks", invoiceId] as const,
};

export function usePaymentTask(invoiceId: string, enabled: boolean) {
  return useQuery({
    queryKey: paymentTaskKeys.byInvoice(invoiceId),
    queryFn: () => api.get<PaymentTask>(`/api/invoices/${invoiceId}/payment-task`),
    enabled: Boolean(invoiceId) && enabled,
  });
}
