ALTER TABLE `idempotency_keys` ADD `expires_at` datetime(3) NULL;
--> statement-breakpoint
UPDATE `idempotency_keys` SET `expires_at` = DATE_ADD(`created_at`, INTERVAL 24 HOUR) WHERE `expires_at` IS NULL;
--> statement-breakpoint
ALTER TABLE `idempotency_keys` MODIFY `expires_at` datetime(3) NOT NULL;
--> statement-breakpoint
CREATE INDEX `idempotency_keys_expires_at_idx` ON `idempotency_keys` (`expires_at`);
