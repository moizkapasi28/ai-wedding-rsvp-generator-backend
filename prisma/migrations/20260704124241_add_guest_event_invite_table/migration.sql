-- CreateTable
CREATE TABLE "GuestEventInvite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "guest_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestEventInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestEventInvite_guest_id_idx" ON "GuestEventInvite"("guest_id");

-- CreateIndex
CREATE INDEX "GuestEventInvite_event_id_idx" ON "GuestEventInvite"("event_id");

-- CreateIndex
CREATE INDEX "Event_wedding_id_idx" ON "Event"("wedding_id");

-- CreateIndex
CREATE INDEX "Event_title_idx" ON "Event"("title");

-- CreateIndex
CREATE INDEX "Guest_name_idx" ON "Guest"("name");

-- CreateIndex
CREATE INDEX "Guest_mobile_number_idx" ON "Guest"("mobile_number");

-- AddForeignKey
ALTER TABLE "GuestEventInvite" ADD CONSTRAINT "GuestEventInvite_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestEventInvite" ADD CONSTRAINT "GuestEventInvite_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
