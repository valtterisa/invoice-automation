import { FilePdf } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoiceFileUrl } from "../api/hooks";

type InvoicePdfViewerProps = {
  invoiceId: string;
};

export function InvoicePdfViewer({ invoiceId }: InvoicePdfViewerProps) {
  const fileQuery = useInvoiceFileUrl(invoiceId, true);

  if (fileQuery.isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center rounded-lg border border-border bg-muted/40">
        <div className="flex w-full max-w-sm flex-col gap-3 p-6">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (fileQuery.isError || !fileQuery.data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-8 text-center">
        <FilePdf className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">PDF could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/50 shadow-sm">
      <object
        data={fileQuery.data}
        type="application/pdf"
        className="h-[70vh] w-full bg-card"
        title="Invoice PDF"
      >
        <iframe src={fileQuery.data} className="h-[70vh] w-full border-0 bg-card" title="Invoice PDF" />
      </object>
    </div>
  );
}
