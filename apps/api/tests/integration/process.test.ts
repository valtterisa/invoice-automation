import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtractedInvoice, IssueType } from "@invoice-agent/shared";
import { createInvoiceService } from "../../src/modules/invoices/invoice.service.js";
import type { InvoiceRepository } from "../../src/modules/invoices/invoice.repository.js";
import type { InvoiceDto } from "../../src/modules/invoices/invoice.types.js";
import type { ObjectStorage } from "../../src/infrastructure/storage/s3.js";
import type { InvoiceExtractor } from "../../src/infrastructure/ai/invoice-extractor.js";
import {
  createMockInvoiceExtractor,
  MOCK_EXTRACTED_INVOICE,
} from "../../src/infrastructure/ai/invoice-extractor.js";
import { hashRequestPayload } from "../../src/shared/idempotency/index.js";
import { finnishExtracted, makeInvoiceDto } from "../fixtures/finnish-invoice.js";

function uploadedInvoice(overrides: Partial<InvoiceDto> = {}): InvoiceDto {
  return makeInvoiceDto({
    id: "inv-process",
    status: "uploaded",
    vendorName: null,
    invoiceNumber: null,
    invoiceDate: null,
    dueDate: null,
    currency: null,
    subtotal: null,
    vat: null,
    total: null,
    lineItems: [],
    issues: [],
    ...overrides,
  });
}

function buildService(
  repo: InvoiceRepository,
  storage: ObjectStorage,
  extractor: InvoiceExtractor,
) {
  return createInvoiceService({ repo, storage, extractor });
}

describe("process invoice flow", () => {
  let storage: ObjectStorage;
  let extractor: InvoiceExtractor;
  let repo: InvoiceRepository;
  let lastApplied: {
    issues: Array<{ code: IssueType; severity: string }>;
    status: string;
    extracted: ExtractedInvoice;
  } | null;

  beforeEach(() => {
    lastApplied = null;
    storage = {
      putPdf: vi.fn(),
      getSignedGetUrl: vi.fn(),
      getObjectBuffer: vi.fn(async () => Buffer.from("%PDF-1.4 mock")),
    };
    extractor = {
      extractFromPdf: vi.fn(async () => finnishExtracted),
    };
    repo = {
      findIdempotency: vi.fn(async () => null),
      saveIdempotency: vi.fn(async () => undefined),
      findById: vi.fn(async () => uploadedInvoice()),
      claimForProcessing: vi.fn(async () => true),
      existsDuplicate: vi.fn(async () => false),
      applyExtractionResult: vi.fn(async (input) => {
        lastApplied = {
          issues: input.issues as Array<{ code: IssueType; severity: string }>,
          status: input.status,
          extracted: input.extracted as ExtractedInvoice,
        };
        return makeInvoiceDto({
          id: "inv-process",
          status: "needs_review",
          vendorName: finnishExtracted.vendorName,
          invoiceNumber: finnishExtracted.invoiceNumber,
          total: "124.0000",
          currency: "EUR",
          issues: (
            input.issues as Array<{ code: IssueType; severity: string }>
          ).map((issue, index) => ({
            id: `issue-${index}`,
            code: issue.code,
            message: "msg",
            severity: issue.severity as "error" | "warning",
            field: null,
          })),
        });
      }),
      markFailed: vi.fn(async (id: string, reason: string) =>
        uploadedInvoice({ id, status: "failed", failureReason: reason }),
      ),
    } as unknown as InvoiceRepository;
  });

  it("moves uploaded → processing → needs_review with extracted fields", async () => {
    const service = buildService(repo, storage, extractor);
    const result = await service.process("inv-process", "idem-ok");

    expect(result.invoice.status).toBe("needs_review");
    expect(result.invoice.vendorName).toBe("Dev Services Oy");
    expect(result.invoice.total).toBe("124.0000");
    expect(repo.claimForProcessing).toHaveBeenCalledWith("inv-process");
    expect(lastApplied?.status).toBe("needs_review");
    expect(lastApplied?.issues).toEqual([]);
  });

  it("keeps needs_review and records issues when totals mismatch", async () => {
    extractor = {
      extractFromPdf: vi.fn(async () => ({
        ...finnishExtracted,
        total: "999.00",
      })),
    };
    const service = buildService(repo, storage, extractor);
    const result = await service.process("inv-process", "idem-issues");

    expect(result.invoice.status).toBe("needs_review");
    expect(repo.markFailed).not.toHaveBeenCalled();
    expect(lastApplied?.issues.some((i) => i.code === "TOTAL_MISMATCH")).toBe(
      true,
    );
    expect(result.invoice.issues.some((i) => i.code === "TOTAL_MISMATCH")).toBe(
      true,
    );
  });

  it("marks failed when Claude times out or errors", async () => {
    extractor = {
      extractFromPdf: vi.fn(async () => {
        throw new Error("Claude timeout after 30s");
      }),
    };
    const service = buildService(repo, storage, extractor);
    const result = await service.process("inv-process", "idem-timeout");

    expect(result.invoice.status).toBe("failed");
    expect(result.invoice.failureReason).toContain("Claude timeout");
    expect(repo.markFailed).toHaveBeenCalledOnce();
    expect(repo.applyExtractionResult).not.toHaveBeenCalled();
  });

  it("marks failed when Claude returns malformed JSON", async () => {
    extractor = {
      extractFromPdf: vi.fn(async () => {
        throw new Error("Malformed extraction JSON from model");
      }),
    };
    const service = buildService(repo, storage, extractor);
    const result = await service.process("inv-process", "idem-malformed");

    expect(result.invoice.status).toBe("failed");
    expect(result.invoice.failureReason).toMatch(/Malformed/);
  });

  it("uses ANTHROPIC_MOCK extractor path with deterministic Finnish data", async () => {
    extractor = createMockInvoiceExtractor();
    const service = buildService(repo, storage, extractor);
    const result = await service.process("inv-process", "idem-mock");

    expect(result.invoice.status).toBe("needs_review");
    expect(lastApplied?.extracted).toEqual(MOCK_EXTRACTED_INVOICE);
    expect(lastApplied?.extracted.currency).toBe("EUR");
    expect(lastApplied?.extracted.vendorName).toContain("Oy");
  });

  it("returns cached process response without calling Claude or S3", async () => {
    const cachedInvoice = makeInvoiceDto({
      id: "inv-process",
      status: "needs_review",
    });
    const requestHash = hashRequestPayload({ invoiceId: "inv-process" });
    (repo.findIdempotency as ReturnType<typeof vi.fn>).mockResolvedValue({
      requestHash,
      responseStatus: 200,
      responseBody: cachedInvoice,
    });

    const service = buildService(repo, storage, extractor);
    const result = await service.process("inv-process", "idem-cache");

    expect(result.fromCache).toBe(true);
    expect(result.invoice.id).toBe("inv-process");
    expect(extractor.extractFromPdf).not.toHaveBeenCalled();
    expect(storage.getObjectBuffer).not.toHaveBeenCalled();
    expect(repo.claimForProcessing).not.toHaveBeenCalled();
  });

  it("rejects process when claim fails because status is already approved", async () => {
    (repo.claimForProcessing as ReturnType<typeof vi.fn>).mockResolvedValue(
      false,
    );
    (repo.findById as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(uploadedInvoice({ status: "approved" }))
      .mockResolvedValueOnce(uploadedInvoice({ status: "approved" }));

    const service = buildService(repo, storage, extractor);
    await expect(
      service.process("inv-process", "idem-approved"),
    ).rejects.toMatchObject({
      code: "INVALID_STATE",
      message: expect.stringMatching(/approved.*processing/i),
    });
  });

  it("conflicts when Idempotency-Key is reused with a different request hash", async () => {
    (repo.findIdempotency as ReturnType<typeof vi.fn>).mockResolvedValue({
      requestHash: "other-payload-hash",
      responseStatus: 200,
      responseBody: makeInvoiceDto({ id: "inv-process", status: "needs_review" }),
    });

    const service = buildService(repo, storage, extractor);
    await expect(
      service.process("inv-process", "idem-reuse"),
    ).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
    });
  });

  it("requires Idempotency-Key header", async () => {
    const service = buildService(repo, storage, extractor);
    await expect(service.process("inv-process", undefined)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
