import {
  decimal,
  int,
  mysqlTable,
  varchar,
  index,
} from "drizzle-orm/mysql-core";
import { invoices } from "./invoices.js";

export const invoiceLineItems = mysqlTable(
  "invoice_line_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    invoiceId: varchar("invoice_id", { length: 36 })
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    lineNumber: int("line_number").notNull(),
    description: varchar("description", { length: 1024 }).notNull(),
    quantity: decimal("quantity", { precision: 19, scale: 4 }).notNull(),
    unitPrice: decimal("unit_price", { precision: 19, scale: 4 }).notNull(),
    amount: decimal("amount", { precision: 19, scale: 4 }).notNull(),
  },
  (table) => [
    index("invoice_line_items_invoice_id_idx").on(table.invoiceId),
  ],
);

export type InvoiceLineItemRow = typeof invoiceLineItems.$inferSelect;
export type NewInvoiceLineItemRow = typeof invoiceLineItems.$inferInsert;
