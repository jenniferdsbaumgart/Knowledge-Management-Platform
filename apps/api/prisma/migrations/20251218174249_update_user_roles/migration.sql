/*
  Warnings:

  - The values [EDITOR,VIEWER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'CLIENT');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CLIENT';
COMMIT;

-- AlterTable
ALTER TABLE "analytics_events" ADD COLUMN     "organisation_id" UUID;

-- AlterTable
ALTER TABLE "faq_entries" ADD COLUMN     "embedding" vector(1536);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CLIENT';

-- CreateIndex
CREATE INDEX "analytics_events_organisation_id_idx" ON "analytics_events"("organisation_id");

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
