PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_publisher_bundle` (
	`id` text PRIMARY KEY NOT NULL,
	`publisherAccountId` text,
	`githubOwner` text NOT NULL,
	`githubRepo` text NOT NULL,
	`githubFullName` text NOT NULL,
	`githubRepoId` integer,
	`defaultBranch` text,
	`repoHtmlUrl` text,
	`manifestJson` text,
	`accentColor` text,
	`stars` integer DEFAULT 0 NOT NULL,
	`forks` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`publisherAccountId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_publisher_bundle`(
	"id",
	"publisherAccountId",
	"githubOwner",
	"githubRepo",
	"githubFullName",
	"githubRepoId",
	"defaultBranch",
	"repoHtmlUrl",
	"manifestJson",
	"accentColor",
	"stars",
	"forks",
	"status",
	"createdAt",
	"updatedAt"
) SELECT
	"id",
	"publisherAccountId",
	"githubOwner",
	"githubRepo",
	"githubFullName",
	"githubRepoId",
	"defaultBranch",
	"repoHtmlUrl",
	"manifestJson",
	"accentColor",
	"stars",
	"forks",
	"status",
	"createdAt",
	"updatedAt"
FROM `publisher_bundle`;--> statement-breakpoint
DROP TABLE `publisher_bundle`;--> statement-breakpoint
ALTER TABLE `__new_publisher_bundle` RENAME TO `publisher_bundle`;--> statement-breakpoint

CREATE TABLE `publish_claim` (
	`id` text PRIMARY KEY NOT NULL,
	`repoFullName` text NOT NULL,
	`claimCode` text NOT NULL,
	`claimFilePath` text DEFAULT 'opendots-claim.txt' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`bundleId` text,
	`createdAt` integer NOT NULL,
	`expiresAt` integer NOT NULL,
	`completedAt` integer,
	FOREIGN KEY (`bundleId`) REFERENCES `publisher_bundle`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `publish_claim_repo_idx` ON `publish_claim` (`repoFullName`);
--> statement-breakpoint
CREATE INDEX `publish_claim_code_idx` ON `publish_claim` (`claimCode`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
