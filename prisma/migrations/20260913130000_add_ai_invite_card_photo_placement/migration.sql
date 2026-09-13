-- CreateEnum
CREATE TYPE "PhotoPlacement" AS ENUM ('SWAP_IN_PLACE', 'FRAMED_INSET');

-- AlterTable
ALTER TABLE "AIEventInviteCard" ADD COLUMN     "photo_placement" "PhotoPlacement";
