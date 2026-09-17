CREATE TABLE `invoices` (
  `id` varchar(36) NOT NULL,
  `status` enum('uploaded','processing','needs_review','approved','failed') NOT NULL DEFAULT 'uploaded',
  `file_key` varchar(255) NOT NULL,
  `original_filename` varchar(512) NOT NULL,
  `mime_type` varchar(128) NOT NULL,
  `file_size` int NOT NULL,
  `vendor_name` varchar(512),
  `invoice_number` varchar(255),
  `invoice_date` varchar(10),
  `due_date` varchar(10),
  `currency` varchar(3),
  `subtotal` decimal(19,4),
  `vat` decimal(19,4),
  `total` decimal(19,4),
  `extraction_raw` json,
  `failure_reason` text,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);
--> statement-breakpoint
CREATE INDEX `invoices_vendor_invoice_idx` ON `invoices` (`vendor_name`,`invoice_number`);
--> statement-breakpoint
CREATE INDEX `invoices_created_at_idx` ON `invoices` (`created_at`);
--> statement-breakpoint
CREATE TABLE `invoice_line_items` (
  `id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) NOT NULL,
  `line_number` int NOT NULL,
  `description` varchar(1024) NOT NULL,
  `quantity` decimal(19,4) NOT NULL,
  `unit_price` decimal(19,4) NOT NULL,
  `amount` decimal(19,4) NOT NULL,
  CONSTRAINT `invoice_line_items_id` PRIMARY KEY(`id`),
  CONSTRAINT `invoice_line_items_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `invoice_line_items_invoice_id_idx` ON `invoice_line_items` (`invoice_id`);
--> statement-breakpoint
CREATE TABLE `invoice_issues` (
  `id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) NOT NULL,
  `code` varchar(64) NOT NULL,
  `message` text NOT NULL,
  `severity` enum('error','warning','info') NOT NULL,
  `field` varchar(128),
  CONSTRAINT `invoice_issues_id` PRIMARY KEY(`id`),
  CONSTRAINT `invoice_issues_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX `invoice_issues_invoice_id_idx` ON `invoice_issues` (`invoice_id`);
--> statement-breakpoint
CREATE TABLE `payment_tasks` (
  `id` varchar(36) NOT NULL,
  `invoice_id` varchar(36) NOT NULL,
  `vendor_name` varchar(512) NOT NULL,
  `amount` decimal(19,4) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `due_date` varchar(10),
  `status` enum('pending','completed') NOT NULL DEFAULT 'pending',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `payment_tasks_id` PRIMARY KEY(`id`),
  CONSTRAINT `payment_tasks_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_tasks_invoice_id_uidx` ON `payment_tasks` (`invoice_id`);
--> statement-breakpoint
CREATE TABLE `idempotency_keys` (
  `id` varchar(36) NOT NULL,
  `key` varchar(128) NOT NULL,
  `scope` varchar(255) NOT NULL,
  `request_hash` varchar(64) NOT NULL,
  `response_status` int NOT NULL,
  `response_body` json NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `idempotency_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_keys_key_scope_uidx` ON `idempotency_keys` (`key`,`scope`);
