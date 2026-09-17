import { randomUUID } from "node:crypto";
import type { InvoiceExtractor } from "../../infrastructure/ai/invoice-extractor.js";
import type { ObjectStorage } from "../../infrastructure/storage/s3.js";
import { logger } from "../../infrastructure/logger.js";
import { getConfig } from "../../shared/config/index.js";
import {
  AppError,
  badRequest,
  conflict,
  invalidState,
  notFound,
  payloadTooLarge,
  unsupportedMediaType,
} from "../../shared/errors/index.js";
import {
  assertIdempotencyMatch,
  buildIdempotencyScope,
  hashRequestPayload,
  requireIdempotencyKey,
} from "../../shared/idempotency/index.js";
import type { InvoiceRepository } from "./invoice.repository.js";
import type {
  InvoiceDto,
  InvoiceListItemDto,
  PatchInvoiceInput,
  PaymentTaskDto,
} from "./invoice.types.js";
import { validateExtractedInvoice } from "./invoice.validation.js";

const PDF_MIME = "application/pdf";
const FILE_KEY_RE = /^invoices\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.pdf$/i;

export type PresignUploadInput = {
  filename: string;
  contentType: string;
  size: number;
};

export type PresignUploadResult = {
  uploadUrl: string;
  fileKey: string;
  expiresIn: number;
};

export type CreateFromStoredInput = {
  fileKey: string;
  originalFilename: string;
  fileSize: number;
};

export type ProcessResult = {
  invoice: InvoiceDto;
  fromCache?: boolean;
};

export type ApproveResult = {
  invoice: InvoiceDto;
  paymentTask: PaymentTaskDto;
  fromCache?: boolean;
};

export type InvoiceServiceDeps = {
  repo: InvoiceRepository;
  storage: ObjectStorage;
  extractor: InvoiceExtractor;
};

export function createInvoiceService(deps: InvoiceServiceDeps) {
  const { repo, storage, extractor } = deps;

  async function createFromUpload(
    file: Express.Multer.File,
  ): Promise<InvoiceDto> {
    const id = randomUUID();
    const fileKey = `invoices/${id}.pdf`;
    await storage.putPdf(fileKey, file.buffer, "application/pdf");
    return repo.createUploaded({
      id,
      fileKey,
      originalFilename: file.originalname,
      mimeType: "application/pdf",
      fileSize: file.size,
    });
  }

  async function createUploadUrl(
    input: PresignUploadInput,
  ): Promise<PresignUploadResult> {
    const config = getConfig();
    const filename = input.filename.trim();
    if (!filename.toLowerCase().endsWith(".pdf")) {
      throw unsupportedMediaType("Only PDF files are accepted");
    }
    if (input.contentType.toLowerCase() !== PDF_MIME) {
      throw unsupportedMediaType("Only PDF files are accepted");
    }
    if (!Number.isFinite(input.size) || input.size <= 0) {
      throw badRequest("size must be a positive number");
    }
    if (input.size > config.UPLOAD_MAX_BYTES) {
      throw payloadTooLarge("Uploaded file exceeds size limit");
    }

    const id = randomUUID();
    const fileKey = `invoices/${id}.pdf`;
    const expiresIn = 900;
    const uploadUrl = await storage.getSignedPutUrl(
      fileKey,
      PDF_MIME,
      expiresIn,
    );
    return { uploadUrl, fileKey, expiresIn };
  }

  async function createFromStored(
    input: CreateFromStoredInput,
  ): Promise<InvoiceDto> {
    const config = getConfig();
    const match = FILE_KEY_RE.exec(input.fileKey);
    if (!match) {
      throw badRequest("Invalid fileKey");
    }
    const id = match[1]!;
    const filename = input.originalFilename.trim();
    if (!filename.toLowerCase().endsWith(".pdf")) {
      throw unsupportedMediaType("Only PDF files are accepted");
    }
    if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
      throw badRequest("fileSize must be a positive number");
    }
    if (input.fileSize > config.UPLOAD_MAX_BYTES) {
      throw payloadTooLarge("Uploaded file exceeds size limit");
    }

    let head: { contentLength: number; contentType: string | undefined };
    try {
      head = await storage.headObject(input.fileKey);
    } catch {
      throw badRequest("Uploaded object not found in storage");
    }
    if (head.contentLength <= 0) {
      throw badRequest("Uploaded object is empty");
    }
    if (head.contentLength > config.UPLOAD_MAX_BYTES) {
      throw payloadTooLarge("Uploaded file exceeds size limit");
    }
    if (
      head.contentType &&
      head.contentType.toLowerCase() !== PDF_MIME
    ) {
      throw unsupportedMediaType("Only PDF files are accepted");
    }

    return repo.createUploaded({
      id,
      fileKey: input.fileKey,
      originalFilename: filename,
      mimeType: "application/pdf",
      fileSize: input.fileSize,
    });
  }

  function list(): Promise<InvoiceListItemDto[]> {
    return repo.list();
  }

  async function getById(id: string): Promise<InvoiceDto> {
    const invoice = await repo.findById(id);
    if (!invoice) {
      throw notFound(`Invoice ${id} not found`);
    }
    return invoice;
  }

  async function patch(id: string, input: PatchInvoiceInput): Promise<InvoiceDto> {
    const existing = await repo.findById(id);
    if (!existing) {
      throw notFound(`Invoice ${id} not found`);
    }
    if (existing.status !== "needs_review") {
      throw invalidState("Only invoices in needs_review can be patched");
    }
    const updated = await repo.patch(id, input);
    if (!updated) {
      throw notFound(`Invoice ${id} not found`);
    }
    return updated;
  }

  async function getFileUrl(
    id: string,
  ): Promise<{ url: string; expiresIn: number }> {
    const invoice = await getById(id);
    const expiresIn = 900;
    const url = await storage.getSignedGetUrl(invoice.fileKey, expiresIn);
    return { url, expiresIn };
  }

  async function process(
    id: string,
    idempotencyKeyHeader: string | undefined,
  ): Promise<ProcessResult> {
    const key = requireIdempotencyKey(idempotencyKeyHeader);
    const scope = buildIdempotencyScope("process", id);
    const requestHash = hashRequestPayload({ invoiceId: id });

    const cached = await repo.findIdempotency(key, scope);
    if (cached) {
      assertIdempotencyMatch(
        {
          key,
          scope,
          requestHash: cached.requestHash,
          responseStatus: cached.responseStatus,
          responseBody: cached.responseBody,
          createdAt: new Date(),
        },
        requestHash,
      );
      return {
        invoice: cached.responseBody as InvoiceDto,
        fromCache: true,
      };
    }

    const invoice = await repo.findById(id);
    if (!invoice) {
      throw notFound(`Invoice ${id} not found`);
    }

    const claimed = await repo.claimForProcessing(id);
    if (!claimed) {
      const raced = await repo.findIdempotency(key, scope);
      if (raced) {
        assertIdempotencyMatch(
          {
            key,
            scope,
            requestHash: raced.requestHash,
            responseStatus: raced.responseStatus,
            responseBody: raced.responseBody,
            createdAt: new Date(),
          },
          requestHash,
        );
        return {
          invoice: raced.responseBody as InvoiceDto,
          fromCache: true,
        };
      }
      const current = await repo.findById(id);
      if (!current) {
        throw notFound(`Invoice ${id} not found`);
      }
      throw invalidState(
        `Cannot transition invoice from ${current.status} to processing`,
      );
    }

    try {
      const pdfBytes = await storage.getObjectBuffer(invoice.fileKey);
      const extracted = await extractor.extractFromPdf(pdfBytes);
      const issues = await validateExtractedInvoice(
        extracted,
        async (lookup) =>
          repo.existsDuplicate(
            lookup.vendorName,
            lookup.invoiceNumber,
            lookup.excludeInvoiceId,
          ),
        id,
      );

      const result = await repo.applyExtractionResult({
        invoiceId: id,
        extracted,
        issues,
        status: "needs_review",
        failureReason: null,
        raw: extracted,
      });

      await repo.saveIdempotency({
        key,
        scope,
        requestHash,
        responseStatus: 200,
        responseBody: result,
      });

      return { invoice: result };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invoice processing failed";
      logger.warn(
        {
          invoice_id: id,
          operation: "process",
          error_code: "PROCESS_FAILED",
          err: message,
        },
        "Invoice process failed",
      );
      const failed = await repo.markFailed(id, message);
      await repo.saveIdempotency({
        key,
        scope,
        requestHash,
        responseStatus: 200,
        responseBody: failed,
      });
      return { invoice: failed };
    }
  }

  async function approve(
    id: string,
    idempotencyKeyHeader: string | undefined,
  ): Promise<ApproveResult> {
    const key = requireIdempotencyKey(idempotencyKeyHeader);
    const scope = buildIdempotencyScope("approve", id);
    const requestHash = hashRequestPayload({ invoiceId: id });

    const cached = await repo.findIdempotency(key, scope);
    if (cached) {
      assertIdempotencyMatch(
        {
          key,
          scope,
          requestHash: cached.requestHash,
          responseStatus: cached.responseStatus,
          responseBody: cached.responseBody,
          createdAt: new Date(),
        },
        requestHash,
      );
      return {
        ...(cached.responseBody as {
          invoice: InvoiceDto;
          paymentTask: PaymentTaskDto;
        }),
        fromCache: true,
      };
    }

    try {
      const result = await repo.approveWithPaymentTask(id);
      await repo.saveIdempotency({
        key,
        scope,
        requestHash,
        responseStatus: 200,
        responseBody: result,
      });
      return result;
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      if (message === "NOT_FOUND") {
        throw notFound(`Invoice ${id} not found`);
      }
      if (message.startsWith("INVALID_STATE:")) {
        throw invalidState(
          `Cannot approve invoice in current state (${message.slice("INVALID_STATE:".length)})`,
        );
      }
      if (message === "CONFLICT:payment_task_exists") {
        throw conflict("Payment task already exists for this invoice");
      }
      throw err;
    }
  }

  async function getPaymentTask(invoiceId: string): Promise<PaymentTaskDto> {
    await getById(invoiceId);
    const task = await repo.findPaymentTaskByInvoiceId(invoiceId);
    if (!task) {
      throw notFound(`Payment task for invoice ${invoiceId} not found`);
    }
    return task;
  }

  return {
    createFromUpload,
    createUploadUrl,
    createFromStored,
    list,
    getById,
    patch,
    getFileUrl,
    process,
    approve,
    getPaymentTask,
  };
}

export type InvoiceService = ReturnType<typeof createInvoiceService>;

export function parsePresignBody(body: unknown): PresignUploadInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw badRequest("Invalid upload request body");
  }
  const input = body as Record<string, unknown>;
  if (typeof input.filename !== "string") {
    throw badRequest("filename must be a string");
  }
  if (typeof input.contentType !== "string") {
    throw badRequest("contentType must be a string");
  }
  if (typeof input.size !== "number") {
    throw badRequest("size must be a number");
  }
  return {
    filename: input.filename,
    contentType: input.contentType,
    size: input.size,
  };
}

export function parseCreateFromStoredBody(body: unknown): CreateFromStoredInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw badRequest("Invalid create body");
  }
  const input = body as Record<string, unknown>;
  if (typeof input.fileKey !== "string") {
    throw badRequest("fileKey must be a string");
  }
  if (typeof input.originalFilename !== "string") {
    throw badRequest("originalFilename must be a string");
  }
  if (typeof input.fileSize !== "number") {
    throw badRequest("fileSize must be a number");
  }
  return {
    fileKey: input.fileKey,
    originalFilename: input.originalFilename,
    fileSize: input.fileSize,
  };
}

export function parsePatchBody(body: unknown): PatchInvoiceInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw badRequest("Invalid patch body");
  }
  const input = body as Record<string, unknown>;
  const allowed = [
    "vendorName",
    "invoiceNumber",
    "invoiceDate",
    "dueDate",
    "currency",
    "subtotal",
    "vat",
    "total",
  ] as const;
  const result: PatchInvoiceInput = {};
  for (const key of allowed) {
    if (!(key in input)) continue;
    const value = input[key];
    if (key === "dueDate") {
      if (value !== null && typeof value !== "string") {
        throw badRequest("dueDate must be a string or null");
      }
      result.dueDate = value as string | null;
      continue;
    }
    if (typeof value !== "string") {
      throw badRequest(`${key} must be a string`);
    }
    result[key] = value;
  }
  return result;
}
