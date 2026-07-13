/*
  Warnings:

  - Added the required column `address` to the `Wedding` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN     "address" TEXT NOT NULL;
