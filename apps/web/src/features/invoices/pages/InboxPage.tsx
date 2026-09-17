import { FileArrowUp } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useInvoices } from "../api/hooks";
import { InvoiceTable } from "../components/InvoiceTable";
import { UploadInvoiceButton } from "../components/UploadInvoiceButton";

export function InboxPage() {
  const navigate = useNavigate();
  const invoicesQuery = useInvoices();
  const invoices = invoicesQuery.data ?? [];
  const isEmpty = invoicesQuery.isSuccess && invoices.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload, review, and approve invoices for payment.
          </p>
        </div>
        <UploadInvoiceButton onUploaded={(id) => navigate(`/invoices/${id}`)} />
      </header>

      {invoicesQuery.isLoading ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card p-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : null}

      {invoicesQuery.isError ? (
        <Alert tone="destructive" title="Could not load invoices">
          {invoicesQuery.error instanceof ApiError
            ? invoicesQuery.error.message
            : "Refresh and try again."}
        </Alert>
      ) : null}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <FileArrowUp className="size-8 text-muted-foreground" weight="duotone" />
          <div>
            <p className="text-sm font-medium">No invoices yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a PDF to start review.
            </p>
          </div>
          <UploadInvoiceButton onUploaded={(id) => navigate(`/invoices/${id}`)} />
        </div>
      ) : null}

      {invoicesQuery.isSuccess && invoices.length > 0 ? (
        <InvoiceTable invoices={invoices} />
      ) : null}
    </div>
  );
}
