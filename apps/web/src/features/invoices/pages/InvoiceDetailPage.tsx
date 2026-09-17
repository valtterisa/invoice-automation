import { ArrowLeft } from "@phosphor-icons/react";
import { Link, useParams } from "react-router-dom";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { usePaymentTask } from "@/features/payment-tasks/api/hooks";
import { PaymentTaskSummary } from "@/features/payment-tasks/components/PaymentTaskSummary";
import { useApproveInvoice, useInvoice, useProcessInvoice, useUpdateInvoice } from "../api/hooks";
import { InvoiceFieldsForm } from "../components/InvoiceFieldsForm";
import { InvoiceIssues } from "../components/InvoiceIssues";
import { InvoicePdfViewer } from "../components/InvoicePdfViewer";
import { StatusBadge } from "../components/StatusBadge";
import type { UpdateInvoiceInput } from "../types";

export function InvoiceDetailPage() {
  const { id = "" } = useParams();
  const invoiceQuery = useInvoice(id);
  const updateInvoice = useUpdateInvoice(id);
  const processInvoice = useProcessInvoice(id);
  const approveInvoice = useApproveInvoice(id);
  const invoice = invoiceQuery.data;
  const paymentTaskQuery = usePaymentTask(id, invoice?.status === "approved");

  async function handleSave(input: UpdateInvoiceInput) {
    await updateInvoice.mutateAsync(input);
  }

  if (invoiceQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="min-h-[50vh] w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (invoiceQuery.isError || !invoice) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="destructive" title="Invoice not found">
          {invoiceQuery.error instanceof ApiError
            ? invoiceQuery.error.message
            : "This invoice could not be loaded."}
        </Alert>
        <Link to="/invoices" className="text-sm font-medium text-primary hover:underline">
          Back to inbox
        </Link>
      </div>
    );
  }

  const canProcess = invoice.status === "uploaded" || invoice.status === "failed";
  const canApprove = invoice.status === "needs_review";
  const busy = processInvoice.isPending || approveInvoice.isPending || updateInvoice.isPending;
  const actionError = updateInvoice.error ?? processInvoice.error ?? approveInvoice.error;

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/invoices"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Inbox
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {invoice.vendorName || invoice.originalFilename || "Invoice"}
            </h1>
            <span data-testid="invoice-status">
              <StatusBadge status={invoice.status} />
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoice.invoiceNumber
              ? `Invoice ${invoice.invoiceNumber}`
              : invoice.originalFilename}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canProcess ? (
            <Button
              type="button"
              data-testid="invoice-process"
              loading={processInvoice.isPending}
              disabled={busy && !processInvoice.isPending}
              onClick={() => processInvoice.mutate()}
            >
              {processInvoice.isPending ? "Processing…" : "Process"}
            </Button>
          ) : null}

          {canApprove ? (
            <Button
              type="button"
              data-testid="invoice-approve"
              loading={approveInvoice.isPending}
              disabled={busy && !approveInvoice.isPending}
              onClick={() => approveInvoice.mutate()}
            >
              {approveInvoice.isPending ? "Approving…" : "Approve"}
            </Button>
          ) : null}
        </div>
      </header>

      {invoice.status === "uploaded" ? (
        <Alert tone="info" title="Ready to process">
          Run Process to extract fields from the PDF.
        </Alert>
      ) : null}

      {invoice.status === "processing" ? (
        <Alert tone="info" title="Processing">
          Extraction is running. This page updates automatically.
        </Alert>
      ) : null}

      {invoice.status === "failed" ? (
        <Alert tone="destructive" title="Processing failed">
          {invoice.failureReason || "Fix the source PDF if needed, then run Process again."}
        </Alert>
      ) : null}

      {invoice.status === "approved" ? (
        <Alert tone="success" title="Approved">
          Payment task details are below.
        </Alert>
      ) : null}

      {actionError ? (
        <Alert tone="destructive" title="Action failed">
          {actionError instanceof ApiError
            ? actionError.message
            : "Something went wrong. Try again."}
        </Alert>
      ) : null}

      <InvoiceIssues issues={invoice.issues} />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <InvoicePdfViewer invoiceId={invoice.id} />

        <section className="sticky top-20 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Extracted fields</h2>
          <Separator className="my-3" />
          <InvoiceFieldsForm
            invoice={invoice}
            saving={updateInvoice.isPending}
            disabled={processInvoice.isPending || approveInvoice.isPending}
            onSave={handleSave}
          />
        </section>
      </div>

      {invoice.status === "approved" ? (
        <section className="rounded-lg border border-border bg-card p-4">
          {paymentTaskQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : null}

          {paymentTaskQuery.isError ? (
            <Alert tone="warning" title="Payment task unavailable">
              {paymentTaskQuery.error instanceof ApiError
                ? paymentTaskQuery.error.message
                : "Could not load the payment task."}
            </Alert>
          ) : null}

          {paymentTaskQuery.data ? (
            <PaymentTaskSummary task={paymentTaskQuery.data} />
          ) : paymentTaskQuery.isSuccess ? (
            <p className="text-sm text-muted-foreground">
              No payment task was returned for this invoice.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
