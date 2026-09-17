import {
  datetime,
  decimal,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { PAYMENT_TASK_STATUSES } from "@invoice-agent/shared";
import { invoices } from "./invoices.js";

export const paymentTaskStatusEnum = PAYMENT_TASK_STATUSES;

export const paymentTasks = mysqlTable(
  "payment_tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    invoiceId: varchar("invoice_id", { length: 36 })
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    vendorName: varchar("vendor_name", { length: 512 }).notNull(),
    amount: decimal("amount", { precision: 19, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    dueDate: varchar("due_date", { length: 10 }),
    status: mysqlEnum("status", paymentTaskStatusEnum)
      .notNull()
      .default("pending"),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    updatedAt: datetime("updated_at", { mode: "date", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("payment_tasks_invoice_id_uidx").on(table.invoiceId),
  ],
);

export type PaymentTaskRow = typeof paymentTasks.$inferSelect;
export type NewPaymentTaskRow = typeof paymentTasks.$inferInsert;
