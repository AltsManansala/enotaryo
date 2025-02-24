ALTER TABLE "app"."document" ADD COLUMN "file" text;--> statement-breakpoint
ALTER TABLE "app"."signature" ADD COLUMN "document_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."signature" ADD CONSTRAINT "signature_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "app"."document"("id") ON DELETE no action ON UPDATE no action;