import {
  datetime,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { INVOICE_STATUSES } from "@invoice-agent/shared";

export const invoiceStatusEnum = INVOICE_STATUSES;

export const invoices = mysqlTable(
  "invoices",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    status: mysqlEnum("status", invoiceStatusEnum).notNull().default("uploaded"),
    fileKey: varchar("file_key", { length: 255 }).notNull(),
    originalFilename: varchar("original_filename", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 128 }).notNull(),
    fileSize: int("file_size").notNull(),
    vendorName: varchar("vendor_name", { length: 512 }),
    invoiceNumber: varchar("invoice_number", { length: 255 }),
    invoiceDate: varchar("invoice_date", { length: 10 }),
    dueDate: varchar("due_date", { length: 10 }),
    currency: varchar("currency", { length: 3 }),
    subtotal: decimal("subtotal", { precision: 19, scale: 4 }),
    vat: decimal("vat", { precision: 19, scale: 4 }),
    total: decimal("total", { precision: 19, scale: 4 }),
    extractionRaw: json("extraction_raw"),
    failureReason: text("failure_reason"),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: datetime("updated_at", { mode: "date", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    index("invoices_status_idx").on(table.status),
    index("invoices_vendor_invoice_idx").on(
      table.vendorName,
      table.invoiceNumber,
    ),
    index("invoices_created_at_idx").on(table.createdAt),
  ],
);

export type InvoiceRow = typeof invoices.$inferSelect;
export type NewInvoiceRow = typeof invoices.$inferInsert;
