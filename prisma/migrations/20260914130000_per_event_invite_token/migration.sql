-- RSVP links are per event invite (GuestEventInvite.invite_token), so the guest-level token is no longer needed

-- DropIndex
DROP INDEX "Guest_rsvp_token_key";

-- AlterTable
ALTER TABLE "Guest" DROP COLUMN "rsvp_token";

-- CreateIndex
CREATE UNIQUE INDEX "GuestEventInvite_invite_token_key" ON "GuestEventInvite"("invite_token");
