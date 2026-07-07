-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_wedding_id_fkey";

-- DropForeignKey
ALTER TABLE "GuestEventInvite" DROP CONSTRAINT "GuestEventInvite_event_id_fkey";

-- DropForeignKey
ALTER TABLE "GuestEventInvite" DROP CONSTRAINT "GuestEventInvite_guest_id_fkey";

-- DropForeignKey
ALTER TABLE "Token" DROP CONSTRAINT "Token_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Wedding" DROP CONSTRAINT "Wedding_user_id_fkey";

-- AddForeignKey
ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestEventInvite" ADD CONSTRAINT "GuestEventInvite_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestEventInvite" ADD CONSTRAINT "GuestEventInvite_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
