/*
  Warnings:

  - You are about to drop the column `bride_image` on the `AIEventInviteCard` table. All the data in the column will be lost.
  - You are about to drop the column `groom_image` on the `AIEventInviteCard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AIEventInviteCard" DROP COLUMN "bride_image",
DROP COLUMN "groom_image",
ADD COLUMN     "couple_raw_image_key" TEXT;
