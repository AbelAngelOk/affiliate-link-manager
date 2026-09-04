CREATE TABLE `check_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_id` text NOT NULL,
	`checked_at` integer NOT NULL,
	`resultado` text NOT NULL,
	`detalle` text,
	FOREIGN KEY (`slot_id`) REFERENCES `slots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`titulo` text NOT NULL,
	`descripcion_corta` text NOT NULL,
	`descripcion_larga` text,
	`imagen_url` text NOT NULL,
	`imagen_alt` text,
	`categoria` text NOT NULL,
	`apps` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `slots` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`dominio` text NOT NULL,
	`affiliate_url` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_checked_at` integer,
	`last_ok_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `slots_product_id_dominio_priority_unique` ON `slots` (`product_id`,`dominio`,`priority`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`oauth_subject` text,
	`created_at` integer NOT NULL
);
