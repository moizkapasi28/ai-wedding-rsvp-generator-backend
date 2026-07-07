/*
  Warnings:

  - A unique constraint covering the columns `[guest_id,event_id]` on the table `GuestEventInvite` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dietary` to the `GuestEventInvite` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'ATTENDING', 'DECLINED', 'MAYBE');

-- CreateEnum
CREATE TYPE "Dietary" AS ENUM ('VEGAN', 'VEGETARIAN', 'NON_VEGETARAIN', 'EGGETARIAN', 'LACTOSE_FREE', 'GLUTEN_FREE', 'OTHER');

-- AlterTable
ALTER TABLE "GuestEventInvite" ADD COLUMN     "dietary" "Dietary" NOT NULL,
ADD COLUMN     "invite_deadline" TIMESTAMPTZ(6),
ADD COLUMN     "message" TEXT,
ADD COLUMN     "plus_ones" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "responded_at" TIMESTAMPTZ(6),
ADD COLUMN     "song_request" TEXT,
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "GuestEventInvite_guest_id_event_id_key" ON "GuestEventInvite"("guest_id", "event_id");
