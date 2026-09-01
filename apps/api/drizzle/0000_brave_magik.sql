CREATE TABLE `apps` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`nombre` text NOT NULL,
	`bundle_id` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `check_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_link_id` text NOT NULL,
	`checked_at` integer NOT NULL,
	`resultado` text NOT NULL,
	`detalle` text,
	FOREIGN KEY (`slot_link_id`) REFERENCES `slot_links`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_apps` (
	`product_id` text NOT NULL,
	`app_id` text NOT NULL,
	PRIMARY KEY(`product_id`, `app_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
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
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `slot_links` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_id` text NOT NULL,
	`affiliate_url` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_checked_at` integer,
	`last_ok_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`slot_id`) REFERENCES `slots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `slots` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`provider` text NOT NULL,
	`country` text NOT NULL,
	`status` text DEFAULT 'checking' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `slots_product_id_provider_country_unique` ON `slots` (`product_id`,`provider`,`country`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`oauth_subject` text,
	`created_at` integer NOT NULL
);
