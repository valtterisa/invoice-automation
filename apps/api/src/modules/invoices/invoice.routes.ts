import { Router } from "express";
import { createUploadMiddleware } from "../../shared/middleware/index.js";
import type { InvoiceController } from "./invoice.controller.js";

export function createInvoiceRoutes(controller: InvoiceController): Router {
  const router = Router();
  const upload = createUploadMiddleware();

  router.post("/uploads", controller.createUpload);
  router.post("/", upload, controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.patch);
  router.post("/:id/process", controller.process);
  router.post("/:id/approve", controller.approve);
  router.get("/:id/file", controller.getFile);
  router.get("/:id/payment-task", controller.getPaymentTask);

  return router;
}
