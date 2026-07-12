/*
  Warnings:

  - Added the required column `invite_format_id` to the `GuestEventInvite` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GuestEventInvite" ADD COLUMN     "invite_format_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "GuestEventInvite" ADD CONSTRAINT "GuestEventInvite_invite_format_id_fkey" FOREIGN KEY ("invite_format_id") REFERENCES "GuestEventInviteFormat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
