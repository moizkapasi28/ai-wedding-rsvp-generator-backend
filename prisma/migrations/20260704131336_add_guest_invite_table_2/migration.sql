/*
  Warnings:

  - Made the column `invite_deadline` on table `GuestEventInvite` required. This step will fail if there are existing NULL values in that column.
  - Made the column `responded_at` on table `GuestEventInvite` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "GuestEventInvite" ALTER COLUMN "invite_deadline" SET NOT NULL,
ALTER COLUMN "invite_deadline" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "responded_at" SET NOT NULL;
