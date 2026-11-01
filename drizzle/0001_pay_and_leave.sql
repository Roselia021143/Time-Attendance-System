CREATE TABLE `leave_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`from_date` text NOT NULL,
	`to_date` text NOT NULL,
	`part` text DEFAULT 'full' NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`decision_note` text DEFAULT '' NOT NULL,
	`decided_by` integer,
	`decided_at` integer,
	`created_by` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lr_user_dates` ON `leave_requests` (`user_id`,`from_date`,`to_date`);--> statement-breakpoint
CREATE INDEX `lr_status` ON `leave_requests` (`status`);--> statement-breakpoint
CREATE TABLE `pay_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`effective_from` text NOT NULL,
	`rate_satang` integer NOT NULL,
	`ot_rate_satang` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pr_user` ON `pay_rates` (`user_id`,`effective_from`);