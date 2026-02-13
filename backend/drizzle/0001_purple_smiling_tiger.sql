CREATE TABLE `publisher_bundle` (
	`id` text PRIMARY KEY NOT NULL,
	`publisherAccountId` text NOT NULL,
	`githubOwner` text NOT NULL,
	`githubRepo` text NOT NULL,
	`githubFullName` text NOT NULL,
	`githubRepoId` integer,
	`defaultBranch` text,
	`repoHtmlUrl` text,
	`manifestJson` text,
	`status` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`publisherAccountId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
