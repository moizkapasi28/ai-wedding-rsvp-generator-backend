-- AlterTable
ALTER TABLE "GuestEventInviteFormat" ADD COLUMN     "final_reminder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "first_reminder" BOOLEAN NOT NULL DEFAULT false;
