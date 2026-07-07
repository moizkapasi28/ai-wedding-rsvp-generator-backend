-- AlterTable
ALTER TABLE "GuestEventInvite" ALTER COLUMN "plus_ones" DROP NOT NULL,
ALTER COLUMN "plus_ones" DROP DEFAULT;

-- CreateTable
CREATE TABLE "GuestEventInviteFormat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "dietary_preference" BOOLEAN NOT NULL DEFAULT false,
    "song_request" BOOLEAN NOT NULL DEFAULT false,
    "message" BOOLEAN NOT NULL DEFAULT false,
    "plus_ones" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestEventInviteFormat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestEventInviteFormat_event_id_idx" ON "GuestEventInviteFormat"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "GuestEventInviteFormat_event_id_key" ON "GuestEventInviteFormat"("event_id");

-- AddForeignKey
ALTER TABLE "GuestEventInviteFormat" ADD CONSTRAINT "GuestEventInviteFormat_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
