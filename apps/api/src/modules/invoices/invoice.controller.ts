import type { NextFunction, Request, Response } from "express";
import { sendJson } from "../../shared/http/index.js";
import { requireUploadedPdf } from "../../shared/middleware/upload.js";
import {
  parsePatchBody,
  type InvoiceService,
} from "./invoice.service.js";

export function createInvoiceController(service: InvoiceService) {
  async function create(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const file = requireUploadedPdf(req);
      const invoice = await service.createFromUpload(file);
      sendJson(res, 201, { data: invoice });
    } catch (err) {
      next(err);
    }
  }

  async function list(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const invoices = await service.list();
      sendJson(res, 200, { data: invoices });
    } catch (err) {
      next(err);
    }
  }

  async function getById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const invoice = await service.getById(String(req.params["id"]));
      sendJson(res, 200, { data: invoice });
    } catch (err) {
      next(err);
    }
  }

  async function patch(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const input = parsePatchBody(req.body);
      const invoice = await service.patch(String(req.params["id"]), input);
      sendJson(res, 200, { data: invoice });
    } catch (err) {
      next(err);
    }
  }

  async function process(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await service.process(
        String(req.params["id"]),
        req.header("idempotency-key") ?? undefined,
      );
      sendJson(res, 200, {
        data: result.invoice,
        meta: { fromCache: !!result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  async function approve(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const result = await service.approve(
        String(req.params["id"]),
        req.header("idempotency-key") ?? undefined,
      );
      sendJson(res, 200, {
        data: {
          invoice: result.invoice,
          paymentTask: result.paymentTask,
        },
        meta: { fromCache: !!result.fromCache },
      });
    } catch (err) {
      next(err);
    }
  }

  async function getFile(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const file = await service.getFileUrl(String(req.params["id"]));
      sendJson(res, 200, { data: file });
    } catch (err) {
      next(err);
    }
  }

  async function getPaymentTask(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const task = await service.getPaymentTask(String(req.params["id"]));
      sendJson(res, 200, { data: task });
    } catch (err) {
      next(err);
    }
  }

  return {
    create,
    list,
    getById,
    patch,
    process,
    approve,
    getFile,
    getPaymentTask,
  };
}

export type InvoiceController = ReturnType<typeof createInvoiceController>;
