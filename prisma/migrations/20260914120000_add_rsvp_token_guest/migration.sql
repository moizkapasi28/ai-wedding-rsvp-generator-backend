-- AlterTable: volatile default is evaluated per row, so existing guests get distinct tokens
ALTER TABLE "Guest" ADD COLUMN "rsvp_token" UUID NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "Guest_rsvp_token_key" ON "Guest"("rsvp_token");
