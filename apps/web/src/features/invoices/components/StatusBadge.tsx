import { Badge } from "@/components/ui/Badge";
import { statusBadgeVariant, statusLabel, type InvoiceStatus } from "../types";

type StatusBadgeProps = {
  status: InvoiceStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={statusBadgeVariant(status)}>{statusLabel(status)}</Badge>;
}
