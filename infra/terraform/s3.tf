resource "random_id" "bucket_suffix" {
  byte_length = 4
}

locals {
  invoice_bucket_name = var.invoice_bucket_name != "" ? var.invoice_bucket_name : "${var.project_name}-${var.environment}-invoices-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket" "invoices" {
  bucket = local.invoice_bucket_name

  tags = {
    Name = "${var.project_name}-${var.environment}-invoices"
  }
}

resource "aws_s3_bucket_public_access_block" "invoices" {
  bucket = aws_s3_bucket.invoices.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "invoices" {
  bucket = aws_s3_bucket.invoices.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "invoices" {
  bucket = aws_s3_bucket.invoices.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "invoices" {
  bucket = aws_s3_bucket.invoices.id

  versioning_configuration {
    status = "Enabled"
  }
}
