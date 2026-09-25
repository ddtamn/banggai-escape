DROP INDEX "media_assets_object_key_idx";--> statement-breakpoint
DROP INDEX "media_assets_external_url_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_object_key_idx" ON "media_assets" USING btree ("object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_external_url_idx" ON "media_assets" USING btree ("external_url");