ALTER TABLE `publisher_bundle` ADD `shareCode` text;--> statement-breakpoint
CREATE UNIQUE INDEX `publisher_bundle_share_code_unique_idx` ON `publisher_bundle` (`shareCode`);
