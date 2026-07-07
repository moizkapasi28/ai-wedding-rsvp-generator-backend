/*
  Warnings:

  - Added the required column `invite_token` to the `GuestEventInvite` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GuestEventInvite" ADD COLUMN     "invite_token" UUID NOT NULL;
