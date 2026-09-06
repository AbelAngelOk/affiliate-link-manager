CREATE TABLE `product_field_values` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`product_type_field_id` text NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_type_field_id`) REFERENCES `product_type_fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_field_values_product_field_unique` ON `product_field_values` (`product_id`,`product_type_field_id`);--> statement-breakpoint
CREATE TABLE `product_type_fields` (
	`id` text PRIMARY KEY NOT NULL,
	`product_type_id` text NOT NULL,
	`name` text NOT NULL,
	`field_type` text DEFAULT 'text' NOT NULL,
	`required` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_type_id`) REFERENCES `product_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_types` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `products` ADD `product_type_id` text REFERENCES product_types(id) ON DELETE set null;