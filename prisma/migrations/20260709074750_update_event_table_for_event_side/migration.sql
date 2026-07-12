/*
  Warnings:

  - Added the required column `event_side` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventSide" AS ENUM ('BRIDE', 'GROOM', 'BOTH');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "event_side" "EventSide" NOT NULL;
