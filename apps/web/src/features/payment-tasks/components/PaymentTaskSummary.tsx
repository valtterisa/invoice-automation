import { formatDate, formatMoney } from "@/lib/format";
import { Separator } from "@/components/ui/separator";
import { paymentTaskStatusLabel, type PaymentTask } from "../types";

type PaymentTaskSummaryProps = {
  task: PaymentTask;
};

export function PaymentTaskSummary({ task }: PaymentTaskSummaryProps) {
  return (
    <div data-testid="payment-task">
      <h3 className="text-sm font-semibold">Payment task</h3>
      <Separator className="my-3" />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Vendor</dt>
          <dd className="mt-0.5 text-sm font-medium" data-testid="payment-task-vendor">
            {task.vendorName || "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Amount</dt>
          <dd className="mt-0.5 text-sm font-medium tabular-nums">
            {formatMoney(task.amount, task.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Due date</dt>
          <dd className="mt-0.5 text-sm font-medium tabular-nums">{formatDate(task.dueDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd className="mt-0.5 text-sm font-medium" data-testid="payment-task-status">
            {paymentTaskStatusLabel(task.status)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
