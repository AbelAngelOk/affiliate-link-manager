-- Pivote a auth por email+contraseña (ver 01-solucion-final.md §3): la
-- versión anterior de multi-tenant (API key root + client_id/client_secret)
-- nunca llegó a producción, así que se reemplaza limpio. Cualquier fila de
-- `users` de antes de esta migración no tiene contraseña ni es dueña de
-- ningún `product` real todavía (v1 era single-tenant recién deployado) —
-- se limpia acá en vez de intentar retrocompletarla.
DELETE FROM `users`;
--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `oauth_subject`;
--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` text NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
