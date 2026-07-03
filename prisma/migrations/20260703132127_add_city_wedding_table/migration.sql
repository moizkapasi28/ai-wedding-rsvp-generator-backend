/*
  Warnings:

  - Added the required column `city` to the `Wedding` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN     "city" VARCHAR(256) NOT NULL;
