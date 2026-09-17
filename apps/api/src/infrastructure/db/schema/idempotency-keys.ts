import {
  datetime,
  int,
  json,
  mysqlTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const idempotencyKeys = mysqlTable(
  "idempotency_keys",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    key: varchar("key", { length: 128 }).notNull(),
    scope: varchar("scope", { length: 255 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    responseStatus: int("response_status").notNull(),
    responseBody: json("response_body").notNull(),
    createdAt: datetime("created_at", { mode: "date", fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
  },
  (table) => [
    uniqueIndex("idempotency_keys_key_scope_uidx").on(table.key, table.scope),
  ],
);

export type IdempotencyKeyRow = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKeyRow = typeof idempotencyKeys.$inferInsert;
