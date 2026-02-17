CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`userId` text NOT NULL,
	`token` text,
	`ipAddress` text,
	`userAgent` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
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
CREATE TABLE `publisher_bundle` (
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
CREATE TABLE `import_run` (
	`id` text PRIMARY KEY NOT NULL,
	`bundleId` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`startedAt` integer NOT NULL,
	`finishedAt` integer,
	`commitSha` text NOT NULL,
	`errorCode` text,
	`errorMessage` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`bundleId`) REFERENCES `publisher_bundle`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`bundleId` text NOT NULL,
	`commitSha` text NOT NULL,
	`createdAt` integer NOT NULL,
	`storagePath` text NOT NULL,
	`byteSize` integer NOT NULL,
	`fileIndex` text,
	`safetyResults` text,
	FOREIGN KEY (`bundleId`) REFERENCES `publisher_bundle`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshot_bundle_commit_idx` ON `snapshot` (`bundleId`,`commitSha`);