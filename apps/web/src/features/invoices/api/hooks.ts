import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InvoiceFileResponse } from "@invoice-agent/shared";
import { ApiError, api, createIdempotencyKey } from "@/lib/api";
import { paymentTaskKeys } from "@/features/payment-tasks/api/hooks";
import type { PaymentTask } from "@/features/payment-tasks/types";
import type { Invoice, InvoiceListItem, UpdateInvoiceInput } from "../types";

type ApproveResponse = {
  invoice: Invoice;
  paymentTask: PaymentTask;
};

type IdempotentMutationVars = {
  idempotencyKey: string;
};

export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  detail: (id: string) => [...invoiceKeys.all, "detail", id] as const,
  file: (id: string) => [...invoiceKeys.all, "file", id] as const,
};

export function useInvoices() {
  return useQuery({
    queryKey: invoiceKeys.lists(),
    queryFn: () => api.get<InvoiceListItem[]>("/api/invoices"),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => api.get<Invoice>(`/api/invoices/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "processing" ? 2000 : false;
    },
  });
}

export function useInvoiceFileUrl(id: string, enabled: boolean) {
  return useQuery({
    queryKey: invoiceKeys.file(id),
    queryFn: async () => {
      const payload = await api.get<InvoiceFileResponse>(`/api/invoices/${id}/file`);
      if (!payload?.url) {
        throw new ApiError(500, {
          code: "file_unavailable",
          message: "Could not load invoice PDF",
        });
      }
      return payload.url;
    },
    enabled: Boolean(id) && enabled,
    staleTime: 60_000,
  });
}

export function useUploadInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.postForm<Invoice>("/api/invoices", formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useUpdateInvoice(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateInvoiceInput) =>
      api.patch<Invoice>(`/api/invoices/${id}`, input),
    onSuccess: (invoice) => {
      queryClient.setQueryData(invoiceKeys.detail(id), invoice);
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useProcessInvoice(id: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ idempotencyKey }: IdempotentMutationVars) =>
      api.post<Invoice>(`/api/invoices/${id}/process`, undefined, {
        idempotencyKey,
      }),
    onSuccess: (invoice) => {
      queryClient.setQueryData(invoiceKeys.detail(id), invoice);
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });

  return {
    ...mutation,
    mutate: () => mutation.mutate({ idempotencyKey: createIdempotencyKey() }),
    mutateAsync: () =>
      mutation.mutateAsync({ idempotencyKey: createIdempotencyKey() }),
  };
}

export function useApproveInvoice(id: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ idempotencyKey }: IdempotentMutationVars) =>
      api.post<ApproveResponse>(`/api/invoices/${id}/approve`, undefined, {
        idempotencyKey,
      }),
    onSuccess: ({ invoice, paymentTask }) => {
      queryClient.setQueryData(invoiceKeys.detail(id), invoice);
      queryClient.setQueryData(paymentTaskKeys.byInvoice(id), paymentTask);
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });

  return {
    ...mutation,
    mutate: () => mutation.mutate({ idempotencyKey: createIdempotencyKey() }),
    mutateAsync: () =>
      mutation.mutateAsync({ idempotencyKey: createIdempotencyKey() }),
  };
}
