import { describe, expect, it, vi } from "vitest";
import {
  createInvoiceService,
  type InvoiceService,
} from "../../src/modules/invoices/invoice.service.js";
import type { InvoiceRepository } from "../../src/modules/invoices/invoice.repository.js";
import type { ObjectStorage } from "../../src/infrastructure/storage/s3.js";
import type { InvoiceExtractor } from "../../src/infrastructure/ai/invoice-extractor.js";
import { hashRequestPayload } from "../../src/shared/idempotency/index.js";
import {
  makeInvoiceDto,
  makePaymentTaskDto,
} from "../fixtures/finnish-invoice.js";

function buildService(repo: InvoiceRepository): InvoiceService {
  return createInvoiceService({
    repo,
    storage: {} as ObjectStorage,
    extractor: {} as InvoiceExtractor,
  });
}

describe("approve flow", () => {
  it("creates exactly one payment task for needs_review", async () => {
    const invoice = makeInvoiceDto({ status: "approved" });
    const paymentTask = makePaymentTaskDto();
    let approveCalls = 0;

    const repo = {
      findIdempotency: vi.fn(async () => null),
      saveIdempotency: vi.fn(async () => undefined),
      approveWithPaymentTask: vi.fn(async () => {
        approveCalls += 1;
        return { invoice, paymentTask };
      }),
    } as unknown as InvoiceRepository;

    const result = await buildService(repo).approve("inv-fi-1", "approve-1");

    expect(approveCalls).toBe(1);
    expect(result.invoice.status).toBe("approved");
    expect(result.paymentTask).toEqual(paymentTask);
    expect(result.paymentTask.amount).toBe("124.0000");
    expect(result.paymentTask.currency).toBe("EUR");
    expect(result.paymentTask.vendorName).toBe("Dev Services Oy");
    expect(result.fromCache).toBeUndefined();
  });

  it("rejects approval when repository reports wrong status", async () => {
    const repo = {
      findIdempotency: vi.fn(async () => null),
      approveWithPaymentTask: vi.fn(async () => {
        throw new Error("INVALID_STATE:uploaded");
      }),
    } as unknown as InvoiceRepository;

    await expect(
      buildService(repo).approve("inv-fi-1", "approve-bad-status"),
    ).rejects.toMatchObject({
      code: "INVALID_STATE",
      status: 409,
      message: expect.stringMatching(/uploaded/i),
    });
  });

  it("returns the same cached result on idempotent replay", async () => {
    const payload = {
      invoice: makeInvoiceDto({ status: "approved" }),
      paymentTask: makePaymentTaskDto(),
    };
    const requestHash = hashRequestPayload({ invoiceId: "inv-fi-1" });
    const repo = {
      findIdempotency: vi.fn(async () => ({
        requestHash,
        responseStatus: 200,
        responseBody: payload,
      })),
      saveIdempotency: vi.fn(),
      approveWithPaymentTask: vi.fn(),
    } as unknown as InvoiceRepository;

    const first = await buildService(repo).approve("inv-fi-1", "approve-replay");
    const second = await buildService(repo).approve(
      "inv-fi-1",
      "approve-replay",
    );

    expect(first.fromCache).toBe(true);
    expect(second.fromCache).toBe(true);
    expect(first.paymentTask.id).toBe(second.paymentTask.id);
    expect(repo.approveWithPaymentTask).not.toHaveBeenCalled();
  });

  it("does not create a second payment task on concurrent/duplicate approval", async () => {
    const invoice = makeInvoiceDto({ status: "approved" });
    const paymentTask = makePaymentTaskDto();
    let created = false;

    const repo = {
      findIdempotency: vi.fn(async () => null),
      saveIdempotency: vi.fn(async () => undefined),
      approveWithPaymentTask: vi.fn(async () => {
        if (created) {
          throw new Error("CONFLICT:payment_task_exists");
        }
        created = true;
        return { invoice, paymentTask };
      }),
    } as unknown as InvoiceRepository;

    const service = buildService(repo);
    const first = await service.approve("inv-fi-1", "approve-a");
    await expect(service.approve("inv-fi-1", "approve-b")).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
      message: expect.stringMatching(/payment task already exists/i),
    });

    expect(first.paymentTask.id).toBe("pt-fi-1");
    expect(repo.approveWithPaymentTask).toHaveBeenCalledTimes(2);
  });

  it("requires Idempotency-Key", async () => {
    const repo = {
      findIdempotency: vi.fn(),
      approveWithPaymentTask: vi.fn(),
    } as unknown as InvoiceRepository;

    await expect(buildService(repo).approve("inv-fi-1", undefined)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(repo.approveWithPaymentTask).not.toHaveBeenCalled();
  });

  it("conflicts when the same key is reused with a different payload hash", async () => {
    const repo = {
      findIdempotency: vi.fn(async () => ({
        requestHash: "different-hash",
        responseStatus: 200,
        responseBody: {
          invoice: makeInvoiceDto({ status: "approved" }),
          paymentTask: makePaymentTaskDto(),
        },
      })),
      approveWithPaymentTask: vi.fn(),
    } as unknown as InvoiceRepository;

    await expect(
      buildService(repo).approve("inv-fi-1", "reuse-key"),
    ).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
      status: 409,
    });
    expect(repo.approveWithPaymentTask).not.toHaveBeenCalled();
  });
});
