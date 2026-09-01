PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`provider` text NOT NULL,
	`country` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_slots`("id", "product_id", "provider", "country", "status", "created_at") SELECT "id", "product_id", "provider", "country", "status", "created_at" FROM `slots`;--> statement-breakpoint
DROP TABLE `slots`;--> statement-breakpoint
ALTER TABLE `__new_slots` RENAME TO `slots`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `slots_product_id_provider_country_unique` ON `slots` (`product_id`,`provider`,`country`);