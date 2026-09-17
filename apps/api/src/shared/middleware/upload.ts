import multer from "multer";
import type { Request, RequestHandler } from "express";
import { getConfig } from "../config/index.js";
import {
  payloadTooLarge,
  unsupportedMediaType,
  badRequest,
} from "../errors/index.js";

const PDF_MIME = "application/pdf";

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  const mime = file.mimetype?.toLowerCase();
  const name = file.originalname?.toLowerCase() ?? "";
  if (mime !== PDF_MIME && !name.endsWith(".pdf")) {
    cb(unsupportedMediaType("Only PDF files are accepted"));
    return;
  }
  cb(null, true);
}

export function createUploadMiddleware(): RequestHandler {
  const config = getConfig();
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.UPLOAD_MAX_BYTES, files: 1 },
    fileFilter,
  }).single("file");
}

export function requireUploadedPdf(req: Request): Express.Multer.File {
  const file = req.file;
  if (!file) {
    throw badRequest("PDF file is required (field name: file)");
  }
  if (file.size > getConfig().UPLOAD_MAX_BYTES) {
    throw payloadTooLarge("Uploaded file exceeds size limit");
  }
  const mime = file.mimetype?.toLowerCase();
  if (mime !== PDF_MIME && !file.originalname.toLowerCase().endsWith(".pdf")) {
    throw unsupportedMediaType("Only PDF files are accepted");
  }
  return file;
}
