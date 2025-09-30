CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `location_categories` (
	`location_uuid` text NOT NULL,
	`category_id` text NOT NULL,
	`created_at` integer,
	PRIMARY KEY(`location_uuid`, `category_id`),
	FOREIGN KEY (`location_uuid`) REFERENCES `locations`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `location_idx` ON `location_categories` (`location_uuid`);--> statement-breakpoint
CREATE INDEX `category_idx` ON `location_categories` (`category_id`);--> statement-breakpoint
CREATE TABLE `locations` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`rating` real,
	`photo` text,
	`gmaps_place_id` text NOT NULL,
	`gmaps_url` text NOT NULL,
	`website` text,
	`categories` text NOT NULL,
	`source` text NOT NULL,
	`updated_at` integer,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `categories_idx` ON `locations` (`categories`);