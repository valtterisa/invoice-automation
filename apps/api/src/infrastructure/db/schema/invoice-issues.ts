import {
  index,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import { ISSUE_SEVERITIES } from "@invoice-agent/shared";
import { invoices } from "./invoices.js";

export const issueSeverityEnum = ISSUE_SEVERITIES;

export const invoiceIssues = mysqlTable(
  "invoice_issues",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    invoiceId: varchar("invoice_id", { length: 36 })
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(),
    message: text("message").notNull(),
    severity: mysqlEnum("severity", issueSeverityEnum).notNull(),
    field: varchar("field", { length: 128 }),
  },
  (table) => [index("invoice_issues_invoice_id_idx").on(table.invoiceId)],
);

export type InvoiceIssueRow = typeof invoiceIssues.$inferSelect;
export type NewInvoiceIssueRow = typeof invoiceIssues.$inferInsert;
