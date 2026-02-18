ALTER TABLE `publisher_bundle` ADD `shareCode` text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `publisher_bundle_share_code_unique_idx` ON `publisher_bundle` (`shareCode`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `publish_claim_repo_idx` ON `publish_claim` (`repoFullName`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `publish_claim_code_idx` ON `publish_claim` (`claimCode`);
