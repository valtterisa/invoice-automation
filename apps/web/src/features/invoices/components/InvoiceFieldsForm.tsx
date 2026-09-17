import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { formatDateInput } from "@/lib/format";
import { issueFieldKeys, type Invoice, type UpdateInvoiceInput } from "../types";

type InvoiceFieldsFormProps = {
  invoice: Invoice;
  disabled?: boolean;
  saving?: boolean;
  onSave: (input: UpdateInvoiceInput) => Promise<void>;
};

type FormState = {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  subtotal: string;
  vat: string;
  total: string;
};

function toFormState(invoice: Invoice): FormState {
  return {
    vendorName: invoice.vendorName ?? "",
    invoiceNumber: invoice.invoiceNumber ?? "",
    invoiceDate: formatDateInput(invoice.invoiceDate),
    dueDate: formatDateInput(invoice.dueDate),
    currency: invoice.currency || "EUR",
    subtotal: invoice.subtotal ?? "",
    vat: invoice.vat ?? "",
    total: invoice.total ?? "",
  };
}

function optionalMoney(value: string): string | undefined {
  const trimmed = value.trim().replace(/\s/g, "").replace(",", ".");
  return trimmed || undefined;
}

export function InvoiceFieldsForm({
  invoice,
  disabled = false,
  saving = false,
  onSave,
}: InvoiceFieldsFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(invoice));
  const [totalError, setTotalError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const flagged = issueFieldKeys(invoice.issues);
  const editable = !disabled && invoice.status === "needs_review";

  useEffect(() => {
    setForm(toFormState(invoice));
    setTotalError(undefined);
    setSaved(false);
  }, [invoice]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const total = optionalMoney(form.total);

    if (form.total.trim() && total == null) {
      setTotalError("Enter a valid amount");
      return;
    }

    if (total !== undefined && Number.isNaN(Number(total))) {
      setTotalError("Enter a valid amount");
      return;
    }

    setTotalError(undefined);

    await onSave({
      vendorName: form.vendorName.trim() || undefined,
      invoiceNumber: form.invoiceNumber.trim() || undefined,
      invoiceDate: form.invoiceDate || undefined,
      dueDate: form.dueDate || null,
      currency: form.currency.trim() || undefined,
      subtotal: optionalMoney(form.subtotal),
      vat: optionalMoney(form.vat),
      total,
    });
    setSaved(true);
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      {!editable ? (
        <p className="text-xs text-muted-foreground">
          {invoice.status === "approved"
            ? "Approved invoices are read-only."
            : invoice.status === "processing"
              ? "Fields unlock after processing finishes."
              : "Editable after extraction reaches Needs review."}
        </p>
      ) : null}

      <TextField
        label="Vendor"
        name="vendorName"
        data-testid="field-vendor-name"
        value={form.vendorName}
        onChange={(e) => update("vendorName", e.target.value)}
        disabled={!editable}
        flagged={flagged.has("vendorName") || flagged.has("vendor")}
      />

      <span className="sr-only" data-testid="extracted-vendor">
        {invoice.vendorName ?? ""}
      </span>

      <TextField
        label="Invoice number"
        name="invoiceNumber"
        value={form.invoiceNumber}
        onChange={(e) => update("invoiceNumber", e.target.value)}
        disabled={!editable}
        flagged={flagged.has("invoiceNumber")}
      />

      <TextField
        label="Invoice date"
        name="invoiceDate"
        type="date"
        value={form.invoiceDate}
        onChange={(e) => update("invoiceDate", e.target.value)}
        disabled={!editable}
        flagged={flagged.has("invoiceDate")}
      />

      <TextField
        label="Due date"
        name="dueDate"
        type="date"
        value={form.dueDate}
        onChange={(e) => update("dueDate", e.target.value)}
        disabled={!editable}
        flagged={flagged.has("dueDate")}
      />

      <div className="grid grid-cols-[1.3fr_0.7fr] gap-3">
        <TextField
          label="Subtotal"
          name="subtotal"
          value={form.subtotal}
          onChange={(e) => update("subtotal", e.target.value)}
          disabled={!editable}
          inputMode="decimal"
          flagged={flagged.has("subtotal")}
        />
        <TextField
          label="VAT"
          name="vat"
          value={form.vat}
          onChange={(e) => update("vat", e.target.value)}
          disabled={!editable}
          inputMode="decimal"
          flagged={flagged.has("vat")}
        />
      </div>

      <div className="grid grid-cols-[1.3fr_0.7fr] gap-3">
        <TextField
          label="Total"
          name="total"
          data-testid="field-total"
          value={form.total}
          onChange={(e) => update("total", e.target.value)}
          disabled={!editable}
          error={totalError}
          inputMode="decimal"
          flagged={flagged.has("total")}
        />
        <TextField
          label="Currency"
          name="currency"
          value={form.currency}
          onChange={(e) => update("currency", e.target.value.toUpperCase())}
          disabled={!editable}
          flagged={flagged.has("currency")}
        />
      </div>

      <span className="sr-only" data-testid="extracted-total">
        {invoice.total ?? ""}
      </span>

      {editable ? (
        <div className="flex items-center justify-end gap-3 pt-1">
          {saved && !saving ? (
            <span className="text-xs text-success">Saved</span>
          ) : null}
          <Button type="submit" variant="secondary" loading={saving} data-testid="invoice-save">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
