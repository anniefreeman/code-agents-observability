CREATE TYPE "public"."waitlist_status" AS ENUM('waiting', 'promoted', 'left');--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"attendee_name" text NOT NULL,
	"status" "waitlist_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"promoted_at" timestamp with time zone,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "waitlist_session_id_idx" ON "waitlist_entries" USING btree ("session_id");
