import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import {
  getDb,
  pingDb,
  type Db,
} from "./infrastructure/db/client.js";
import {
  createDefaultInvoiceExtractor,
  type InvoiceExtractor,
} from "./infrastructure/ai/invoice-extractor.js";
import {
  createS3Storage,
  type ObjectStorage,
} from "./infrastructure/storage/s3.js";
import { getConfig } from "./shared/config/index.js";
import { createCorsOptions } from "./shared/http/cors.js";
import {
  errorHandler,
  httpAccessLogMiddleware,
  requestIdMiddleware,
} from "./shared/middleware/index.js";
import { sendJson } from "./shared/http/index.js";
import { createInvoiceController } from "./modules/invoices/invoice.controller.js";
import { createInvoiceRepository } from "./modules/invoices/invoice.repository.js";
import { createInvoiceRoutes } from "./modules/invoices/invoice.routes.js";
import { createInvoiceService } from "./modules/invoices/invoice.service.js";

export type AppDeps = {
  db?: Db;
  storage?: ObjectStorage;
  extractor?: InvoiceExtractor;
};

export function createApp(deps: AppDeps = {}): Express {
  const config = getConfig();
  const db = deps.db ?? getDb();
  const storage = deps.storage ?? createS3Storage();
  const extractor = deps.extractor ?? createDefaultInvoiceExtractor();

  const invoiceRepo = createInvoiceRepository(db);
  const invoiceService = createInvoiceService({
    repo: invoiceRepo,
    storage,
    extractor,
  });
  const invoiceController = createInvoiceController(invoiceService);

  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cors(createCorsOptions(config.CORS_ORIGINS)));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestIdMiddleware);
  app.use(httpAccessLogMiddleware);

  app.get("/health", (_req: Request, res: Response) => {
    sendJson(res, 200, { status: "ok" });
  });

  app.get("/ready", async (req: Request, res: Response) => {
    try {
      const ok = await pingDb();
      if (!ok) {
        res.status(503).json({
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Database unavailable",
            requestId: req.requestId,
          },
        });
        return;
      }
      sendJson(res, 200, { status: "ready" });
    } catch {
      res.status(503).json({
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database unavailable",
          requestId: req.requestId,
        },
      });
    }
  });

  app.use("/api/invoices", createInvoiceRoutes(invoiceController));
  app.use(errorHandler);
  return app;
}
