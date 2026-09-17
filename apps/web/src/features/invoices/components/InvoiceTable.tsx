import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/format";
import type { InvoiceListItem } from "../types";
import { StatusBadge } from "./StatusBadge";

type InvoiceTableProps = {
  invoices: InvoiceListItem[];
};

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const navigate = useNavigate();

  if (invoices.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Vendor</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              tabIndex={0}
              onClick={() => navigate(`/invoices/${row.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/invoices/${row.id}`);
                }
              }}
            >
              <TableCell className="font-medium">{row.vendorName || "-"}</TableCell>
              <TableCell>{row.invoiceNumber || "-"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(row.total, row.currency ?? "EUR")}
              </TableCell>
              <TableCell className="max-w-[14rem] truncate text-muted-foreground">
                {row.originalFilename || "-"}
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {formatDate(row.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
