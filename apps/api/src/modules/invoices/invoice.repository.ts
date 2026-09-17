import { and, desc, eq, ne, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Db } from "../../infrastructure/db/client.js";
import {
  idempotencyKeys,
  invoiceIssues,
  invoiceLineItems,
  invoices,
  paymentTasks,
  type InvoiceIssueRow,
  type InvoiceLineItemRow,
  type InvoiceRow,
  type PaymentTaskRow,
} from "../../infrastructure/db/schema/index.js";
import type { IssueType } from "@invoice-agent/shared";
import type { ExtractedInvoice } from "../../infrastructure/ai/invoice-extractor.js";
import { normalizeMoney } from "../../shared/money/index.js";
import { assertTransition } from "./invoice.transitions.js";
import type {
  InvoiceDto,
  InvoiceIssueDto,
  InvoiceLineItemDto,
  InvoiceListItemDto,
  InvoiceStatus,
  PatchInvoiceInput,
  PaymentTaskDto,
  ValidationIssue,
} from "./invoice.types.js";

function isDuplicateKeyError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = "code" in err ? String((err as { code?: unknown }).code) : "";
  const errno = "errno" in err ? Number((err as { errno?: unknown }).errno) : NaN;
  return code === "ER_DUP_ENTRY" || errno === 1062;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function mapLineItem(row: InvoiceLineItemRow): InvoiceLineItemDto {
  return {
    id: row.id,
    lineNumber: row.lineNumber,
    description: row.description,
    quantity: String(row.quantity),
    unitPrice: String(row.unitPrice),
    amount: String(row.amount),
  };
}

function mapIssue(row: InvoiceIssueRow): InvoiceIssueDto {
  return {
    id: row.id,
    code: row.code as IssueType,
    message: row.message,
    severity: row.severity,
    field: row.field,
  };
}

function mapInvoice(
  row: InvoiceRow,
  lines: InvoiceLineItemRow[],
  issues: InvoiceIssueRow[],
): InvoiceDto {
  return {
    id: row.id,
    status: row.status,
    fileKey: row.fileKey,
    storageKey: row.fileKey,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    vendorName: row.vendorName,
    invoiceNumber: row.invoiceNumber,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate,
    currency: row.currency,
    subtotal: row.subtotal !== null ? String(row.subtotal) : null,
    vat: row.vat !== null ? String(row.vat) : null,
    total: row.total !== null ? String(row.total) : null,
    failureReason: row.failureReason,
    lineItems: lines
      .slice()
      .sort((a, b) => a.lineNumber - b.lineNumber)
      .map(mapLineItem),
    issues: issues.map(mapIssue),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapListItem(row: InvoiceRow): InvoiceListItemDto {
  return {
    id: row.id,
    status: row.status,
    originalFilename: row.originalFilename,
    vendorName: row.vendorName,
    invoiceNumber: row.invoiceNumber,
    total: row.total !== null ? String(row.total) : null,
    currency: row.currency,
    createdAt: toIso(row.createdAt),
  };
}

export function mapPaymentTask(row: PaymentTaskRow): PaymentTaskDto {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    vendorName: row.vendorName,
    amount: String(row.amount),
    currency: row.currency,
    dueDate: row.dueDate,
    status: row.status,
    createdAt: toIso(row.createdAt),
  };
}

export function createInvoiceRepository(db: Db) {
  async function createUploaded(input: {
    id: string;
    fileKey: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
  }): Promise<InvoiceDto> {
    await db.insert(invoices).values({
      id: input.id,
      status: "uploaded",
      fileKey: input.fileKey,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
    });
    const created = await findById(input.id);
    if (!created) {
      throw new Error("Failed to load created invoice");
    }
    return created;
  }

  async function list(): Promise<InvoiceListItemDto[]> {
    const rows = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt));
    return rows.map(mapListItem);
  }

  async function findById(id: string): Promise<InvoiceDto | null> {
    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const [lines, issues] = await Promise.all([
      db
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, id)),
      db
        .select()
        .from(invoiceIssues)
        .where(eq(invoiceIssues.invoiceId, id)),
    ]);
    return mapInvoice(row, lines, issues);
  }

  async function findRowById(id: string): Promise<InvoiceRow | null> {
    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async function updateStatus(
    id: string,
    status: InvoiceStatus,
    extra?: { failureReason?: string | null | undefined },
  ): Promise<void> {
    await db
      .update(invoices)
      .set({
        status,
        failureReason:
          extra && "failureReason" in extra
            ? (extra.failureReason ?? null)
            : undefined,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id));
  }

  async function claimForProcessing(id: string): Promise<boolean> {
    const result = await db
      .update(invoices)
      .set({
        status: "processing",
        failureReason: null,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, id), eq(invoices.status, "uploaded")));
    const header = Array.isArray(result) ? result[0] : result;
    const affected = Number(
      (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0,
    );
    return affected > 0;
  }

  async function patch(
    id: string,
    input: PatchInvoiceInput,
  ): Promise<InvoiceDto | null> {
    const updates: Partial<typeof invoices.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.vendorName !== undefined) updates.vendorName = input.vendorName;
    if (input.invoiceNumber !== undefined)
      updates.invoiceNumber = input.invoiceNumber;
    if (input.invoiceDate !== undefined) updates.invoiceDate = input.invoiceDate;
    if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
    if (input.currency !== undefined) updates.currency = input.currency;
    if (input.subtotal !== undefined)
      updates.subtotal = normalizeMoney(input.subtotal);
    if (input.vat !== undefined) updates.vat = normalizeMoney(input.vat);
    if (input.total !== undefined) updates.total = normalizeMoney(input.total);

    await db.update(invoices).set(updates).where(eq(invoices.id, id));
    return findById(id);
  }

  async function existsDuplicate(
    vendorName: string,
    invoiceNumber: string,
    excludeInvoiceId?: string,
  ): Promise<boolean> {
    const conditions = [
      eq(invoices.vendorName, vendorName),
      eq(invoices.invoiceNumber, invoiceNumber),
    ];
    if (excludeInvoiceId) {
      conditions.push(ne(invoices.id, excludeInvoiceId));
    }
    const rows = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(...conditions))
      .limit(1);
    return rows.length > 0;
  }

  async function applyExtractionResult(input: {
    invoiceId: string;
    extracted: ExtractedInvoice;
    issues: ValidationIssue[];
    status: "needs_review" | "failed";
    failureReason?: string | null;
    raw: unknown;
  }): Promise<InvoiceDto> {
    await db.transaction(async (tx) => {
      await tx
        .delete(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, input.invoiceId));
      await tx
        .delete(invoiceIssues)
        .where(eq(invoiceIssues.invoiceId, input.invoiceId));

      await tx
        .update(invoices)
        .set({
          status: input.status,
          vendorName: input.extracted.vendorName,
          invoiceNumber: input.extracted.invoiceNumber,
          invoiceDate: input.extracted.invoiceDate,
          dueDate: input.extracted.dueDate ?? null,
          currency: input.extracted.currency.toUpperCase(),
          subtotal: normalizeMoney(input.extracted.subtotal),
          vat: normalizeMoney(input.extracted.vat),
          total: normalizeMoney(input.extracted.total),
          extractionRaw: input.raw,
          failureReason: input.failureReason ?? null,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, input.invoiceId));

      if (input.extracted.lineItems.length > 0) {
        await tx.insert(invoiceLineItems).values(
          input.extracted.lineItems.map((line, index) => ({
            id: randomUUID(),
            invoiceId: input.invoiceId,
            lineNumber: index + 1,
            description: line.description,
            quantity: normalizeMoney(line.quantity),
            unitPrice: normalizeMoney(line.unitPrice),
            amount: normalizeMoney(line.amount),
          })),
        );
      }

      if (input.issues.length > 0) {
        await tx.insert(invoiceIssues).values(
          input.issues.map((issue) => ({
            id: randomUUID(),
            invoiceId: input.invoiceId,
            code: issue.code,
            message: issue.message,
            severity: issue.severity,
            field: issue.field ?? null,
          })),
        );
      }
    });

    const result = await findById(input.invoiceId);
    if (!result) {
      throw new Error("Invoice missing after extraction");
    }
    return result;
  }

  async function markFailed(
    invoiceId: string,
    reason: string,
  ): Promise<InvoiceDto> {
    await db
      .update(invoices)
      .set({
        status: "failed",
        failureReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));
    const result = await findById(invoiceId);
    if (!result) {
      throw new Error("Invoice missing after failure update");
    }
    return result;
  }

  async function findIdempotency(
    key: string,
    scope: string,
  ): Promise<{
    requestHash: string;
    responseStatus: number;
    responseBody: unknown;
  } | null> {
    const rows = await db
      .select()
      .from(idempotencyKeys)
      .where(
        and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.scope, scope)),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      requestHash: row.requestHash,
      responseStatus: row.responseStatus,
      responseBody: row.responseBody,
    };
  }

  async function saveIdempotency(input: {
    key: string;
    scope: string;
    requestHash: string;
    responseStatus: number;
    responseBody: unknown;
  }): Promise<void> {
    try {
      await db.insert(idempotencyKeys).values({
        id: randomUUID(),
        key: input.key,
        scope: input.scope,
        requestHash: input.requestHash,
        responseStatus: input.responseStatus,
        responseBody: input.responseBody,
      });
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        throw err;
      }
    }
  }

  async function approveWithPaymentTask(invoiceId: string): Promise<{
    invoice: InvoiceDto;
    paymentTask: PaymentTaskDto;
  }> {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT id FROM invoices WHERE id = ${invoiceId} FOR UPDATE`,
      );

      const lockedRows = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);
      const locked = lockedRows[0];
      if (!locked) {
        throw new Error("NOT_FOUND");
      }

      assertTransition(locked.status, "approved");

      if (!locked.vendorName || !locked.total || !locked.currency) {
        throw new Error("INVALID_STATE:missing_payment_fields");
      }

      const existingTask = await tx
        .select()
        .from(paymentTasks)
        .where(eq(paymentTasks.invoiceId, invoiceId))
        .limit(1);
      if (existingTask[0]) {
        throw new Error("CONFLICT:payment_task_exists");
      }

      const paymentTaskId = randomUUID();
      try {
        await tx.insert(paymentTasks).values({
          id: paymentTaskId,
          invoiceId,
          vendorName: locked.vendorName,
          amount: String(locked.total),
          currency: locked.currency,
          dueDate: locked.dueDate,
          status: "pending",
        });
      } catch (err) {
        if (isDuplicateKeyError(err)) {
          throw new Error("CONFLICT:payment_task_exists");
        }
        throw err;
      }

      await tx
        .update(invoices)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(invoices.id, invoiceId));

      const [lines, issues, taskRows] = await Promise.all([
        tx
          .select()
          .from(invoiceLineItems)
          .where(eq(invoiceLineItems.invoiceId, invoiceId)),
        tx
          .select()
          .from(invoiceIssues)
          .where(eq(invoiceIssues.invoiceId, invoiceId)),
        tx
          .select()
          .from(paymentTasks)
          .where(eq(paymentTasks.id, paymentTaskId))
          .limit(1),
      ]);

      const updatedInvoiceRows = await tx
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);
      const updatedInvoice = updatedInvoiceRows[0];
      const task = taskRows[0];
      if (!updatedInvoice || !task) {
        throw new Error("Failed to load approval result");
      }

      return {
        invoice: mapInvoice(updatedInvoice, lines, issues),
        paymentTask: mapPaymentTask(task),
      };
    });
  }

  async function findPaymentTaskByInvoiceId(
    invoiceId: string,
  ): Promise<PaymentTaskDto | null> {
    const rows = await db
      .select()
      .from(paymentTasks)
      .where(eq(paymentTasks.invoiceId, invoiceId))
      .limit(1);
    const row = rows[0];
    return row ? mapPaymentTask(row) : null;
  }

  return {
    createUploaded,
    list,
    findById,
    findRowById,
    updateStatus,
    claimForProcessing,
    patch,
    existsDuplicate,
    applyExtractionResult,
    markFailed,
    findIdempotency,
    saveIdempotency,
    approveWithPaymentTask,
    findPaymentTaskByInvoiceId,
  };
}

export type InvoiceRepository = ReturnType<typeof createInvoiceRepository>;
