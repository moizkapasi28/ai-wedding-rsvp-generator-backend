/*
  Warnings:

  - Added the required column `group` to the `Guest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Group" AS ENUM ('FRIEND', 'RELATIVE', 'COLLEAGUE', 'EMPLOYEE', 'VIP');

-- AlterEnum
ALTER TYPE "Side" ADD VALUE 'BOTH';

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "accomodation_address" VARCHAR(256),
ADD COLUMN     "accomodation_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "group" "Group" NOT NULL;
