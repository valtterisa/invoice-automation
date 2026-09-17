import {
  addMoney,
  moneyEquals,
  type ExtractedInvoice,
  type IssueType,
} from "@invoice-agent/shared";
import { isValidIsoDate, isDateOnOrBefore } from "../../shared/dates/index.js";
import {
  compareMoney,
  isValidMoneyString,
} from "../../shared/money/index.js";
import type { ValidationIssue } from "./invoice.types.js";

export type DuplicateLookup = {
  vendorName: string;
  invoiceNumber: string;
  excludeInvoiceId?: string | undefined;
};

export type DuplicateChecker = (
  lookup: DuplicateLookup,
) => Promise<boolean>;

function issue(
  code: IssueType,
  message: string,
  severity: ValidationIssue["severity"],
  field?: string,
): ValidationIssue {
  return { code, message, severity, field };
}

function flagNegative(
  issues: ValidationIssue[],
  field: string,
  value: string,
): void {
  if (isValidMoneyString(value) && compareMoney(value, "0") < 0) {
    issues.push(
      issue(
        "NEGATIVE_AMOUNT",
        `${field} must not be negative`,
        "error",
        field,
      ),
    );
  }
}

export async function validateExtractedInvoice(
  extracted: ExtractedInvoice,
  isDuplicate: DuplicateChecker,
  excludeInvoiceId?: string,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  if (!extracted.vendorName.trim()) {
    issues.push(
      issue("MISSING_VENDOR", "vendorName is required", "error", "vendorName"),
    );
  }
  if (!extracted.invoiceNumber.trim()) {
    issues.push(
      issue(
        "MISSING_INVOICE_NUMBER",
        "invoiceNumber is required",
        "error",
        "invoiceNumber",
      ),
    );
  }
  if (!extracted.currency.trim()) {
    issues.push(
      issue("MISSING_CURRENCY", "currency is required", "error", "currency"),
    );
  }

  if (!isValidIsoDate(extracted.invoiceDate)) {
    issues.push(
      issue(
        "MISSING_INVOICE_DATE",
        "invoiceDate must be a valid YYYY-MM-DD date",
        "error",
        "invoiceDate",
      ),
    );
  }

  if (extracted.dueDate) {
    if (!isValidIsoDate(extracted.dueDate)) {
      issues.push(
        issue(
          "INVALID_DATES",
          "dueDate must be a valid YYYY-MM-DD date",
          "error",
          "dueDate",
        ),
      );
    } else if (
      isValidIsoDate(extracted.invoiceDate) &&
      !isDateOnOrBefore(extracted.invoiceDate, extracted.dueDate)
    ) {
      issues.push(
        issue(
          "INVALID_DATES",
          "dueDate must be on or after invoiceDate",
          "error",
          "dueDate",
        ),
      );
    }
  }

  for (const [field, value] of [
    ["subtotal", extracted.subtotal],
    ["vat", extracted.vat],
    ["total", extracted.total],
  ] as const) {
    if (!isValidMoneyString(value)) {
      issues.push(
        issue(
          "INVALID_AMOUNTS",
          `${field} must be a decimal string`,
          "error",
          field,
        ),
      );
    } else {
      flagNegative(issues, field, value);
    }
  }

  if (extracted.lineItems.length === 0) {
    issues.push(
      issue(
        "MISSING_LINE_ITEMS",
        "At least one line item is required",
        "error",
        "lineItems",
      ),
    );
  }

  const lineAmounts: string[] = [];
  extracted.lineItems.forEach((line, index) => {
    const prefix = `lineItems[${index}]`;
    if (!line.description.trim()) {
      issues.push(
        issue(
          "MISSING_LINE_ITEMS",
          "line item description is required",
          "error",
          `${prefix}.description`,
        ),
      );
    }
    for (const [field, value] of [
      ["quantity", line.quantity],
      ["unitPrice", line.unitPrice],
      ["amount", line.amount],
    ] as const) {
      if (!isValidMoneyString(value)) {
        issues.push(
          issue(
            "INVALID_AMOUNTS",
            `${field} must be a decimal string`,
            "error",
            `${prefix}.${field}`,
          ),
        );
      } else {
        flagNegative(issues, `${prefix}.${field}`, value);
      }
    }
    if (isValidMoneyString(line.amount)) {
      lineAmounts.push(line.amount);
    }
  });

  if (
    isValidMoneyString(extracted.subtotal) &&
    isValidMoneyString(extracted.vat) &&
    isValidMoneyString(extracted.total)
  ) {
    const expectedTotal = addMoney(extracted.subtotal, extracted.vat);
    if (!moneyEquals(expectedTotal, extracted.total)) {
      issues.push(
        issue(
          "TOTAL_MISMATCH",
          "Subtotal and VAT do not add up to the invoice total.",
          "warning",
          "total",
        ),
      );
    }
  }

  if (
    lineAmounts.length === extracted.lineItems.length &&
    lineAmounts.length > 0 &&
    isValidMoneyString(extracted.subtotal)
  ) {
    const linesSum = lineAmounts.reduce((acc, value) => addMoney(acc, value), "0");
    if (!moneyEquals(linesSum, extracted.subtotal)) {
      issues.push(
        issue(
          "LINE_ITEM_MISMATCH",
          "sum of line item amounts must equal subtotal",
          "warning",
          "subtotal",
        ),
      );
    }
  }

  if (extracted.vendorName.trim() && extracted.invoiceNumber.trim()) {
    const duplicate = await isDuplicate({
      vendorName: extracted.vendorName.trim(),
      invoiceNumber: extracted.invoiceNumber.trim(),
      excludeInvoiceId,
    });
    if (duplicate) {
      issues.push(
        issue(
          "DUPLICATE_INVOICE",
          "An invoice with the same vendor and invoice number already exists",
          "error",
          "invoiceNumber",
        ),
      );
    }
  }

  return issues;
}

export function hasBlockingIssues(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
