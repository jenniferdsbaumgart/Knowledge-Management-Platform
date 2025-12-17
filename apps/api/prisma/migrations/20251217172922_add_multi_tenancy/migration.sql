-- CreateTable organisations first
CREATE TABLE "organisations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- Create default organisation "Jenny"
INSERT INTO "organisations" ("id", "name", "slug", "created_at", "updated_at")
VALUES ('00000000-0000-0000-0000-000000000001', 'Jenny', 'jenny', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable - Add columns as nullable first
ALTER TABLE "users" ADD COLUMN "organisation_id" UUID;

ALTER TABLE "sources" ADD COLUMN "organisation_id" UUID;

ALTER TABLE "contents" ADD COLUMN "organisation_id" UUID;

ALTER TABLE "faq_entries" ADD COLUMN "organisation_id" UUID;

-- Migrate existing data to default organisation
UPDATE "users" SET "organisation_id" = '00000000-0000-0000-0000-000000000001' WHERE "organisation_id" IS NULL;

UPDATE "sources" SET "organisation_id" = '00000000-0000-0000-0000-000000000001' WHERE "organisation_id" IS NULL;

UPDATE "contents" SET "organisation_id" = '00000000-0000-0000-0000-000000000001' WHERE "organisation_id" IS NULL;

UPDATE "faq_entries" SET "organisation_id" = '00000000-0000-0000-0000-000000000001' WHERE "organisation_id" IS NULL;

-- Now make columns NOT NULL
ALTER TABLE "users" ALTER COLUMN "organisation_id" SET NOT NULL;

ALTER TABLE "sources" ALTER COLUMN "organisation_id" SET NOT NULL;

ALTER TABLE "contents" ALTER COLUMN "organisation_id" SET NOT NULL;

ALTER TABLE "faq_entries" ALTER COLUMN "organisation_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "faq_entries_organisation_id_idx" ON "faq_entries"("organisation_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_entries" ADD CONSTRAINT "faq_entries_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
