import { WarningCircle } from "@phosphor-icons/react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/Badge";
import { sortIssues, type InvoiceIssue } from "../types";

type InvoiceIssuesProps = {
  issues: InvoiceIssue[];
};

function severityVariant(severity: InvoiceIssue["severity"]) {
  switch (severity) {
    case "error":
      return "destructive" as const;
    case "warning":
      return "warning" as const;
    default:
      return "info" as const;
  }
}

export function InvoiceIssues({ issues }: InvoiceIssuesProps) {
  if (issues.length === 0) {
    return null;
  }

  const sorted = sortIssues(issues);
  const hasError = sorted.some((issue) => issue.severity === "error");

  return (
    <Alert
      tone={hasError ? "destructive" : "warning"}
      title={`${sorted.length} review issue${sorted.length === 1 ? "" : "s"}`}
      className="border-l-4"
    >
      <ul className="mt-2 space-y-2">
        {sorted.map((issue) => (
          <li
            key={`${issue.id}-${issue.code}-${issue.field ?? ""}`}
            className="flex items-start gap-2"
          >
            <WarningCircle className="mt-0.5 size-4 shrink-0" weight="fill" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={severityVariant(issue.severity)}>{issue.severity}</Badge>
                <span className="font-medium">{issue.code}</span>
                {issue.field ? (
                  <span className="text-xs text-muted-foreground">field: {issue.field}</span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm opacity-90">{issue.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </Alert>
  );
}
