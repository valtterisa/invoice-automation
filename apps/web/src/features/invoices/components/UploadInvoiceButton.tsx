import { useRef, type ChangeEvent } from "react";
import { UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useUploadInvoice } from "../api/hooks";

type UploadInvoiceButtonProps = {
  onUploaded?: (invoiceId: string) => void;
};

export function UploadInvoiceButton({ onUploaded }: UploadInvoiceButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadInvoice();

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      const invoice = await upload.mutateAsync(file);
      onUploaded?.(invoice.id);
    } catch {
      return;
    }
  }

  const errorMessage =
    upload.error instanceof ApiError
      ? upload.error.message
      : upload.error
        ? "Upload failed. Try again."
        : null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        data-testid="invoice-upload-input"
        onChange={handleChange}
      />
      <Button
        type="button"
        data-testid="invoice-upload-submit"
        loading={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <UploadSimple className="size-4" weight="bold" />
        {upload.isPending ? "Uploading…" : "Upload PDF"}
      </Button>
      {errorMessage ? (
        <p className="text-xs text-destructive" data-testid="invoice-upload-error">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
