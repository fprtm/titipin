CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "birth_date" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_products_name_trgm" ON "products" USING gin ("product_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_products_code_trgm" ON "products" USING gin ("product_code" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_name_trgm" ON "customers" USING gin ("customer_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_phone_trgm" ON "customers" USING gin ("phone" gin_trgm_ops);